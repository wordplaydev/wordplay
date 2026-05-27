import CameraFeed from '@input/CameraFeed';
import { denyConsent, Permission } from '@input/permissions';
import createStreamEvaluator from '@input/createStreamEvaluator';
import PermissionException from '@values/PermissionException';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import type Expression from '@nodes/Expression';
import ListType from '@nodes/ListType';
import type Names from '@nodes/Names';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import { RGBtoLCH } from '@output/ColorJS';
import type Evaluation from '@runtime/Evaluation';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue, { createStructure } from '@values/StructureValue';
import TemporalStreamValue from '@values/TemporalStreamValue';
import type Value from '@values/Value';

/** A single pixel in LCH color space. */
type LCHPixel = { l: number; c: number; h: number };

/** A 2D matrix of LCH pixels, indexed as [row][column]. */
type LCHFrame = LCHPixel[][];

/** Convert raw RGBA ImageData into a row-major LCH matrix. */
function imageDataToLCH(image: ImageData): LCHFrame {
    const frame: LCHFrame = [];
    for (let i = 0; i < image.data.length; i += 4) {
        const index = i / 4;
        const row = Math.floor(index / image.width);
        const column = index % image.width;
        if (frame[row] === undefined) frame[row] = [];

        const lch = RGBtoLCH(
            image.data[i] / 255,
            image.data[i + 1] / 255,
            image.data[i + 2] / 255,
        );
        // PERF: round to integers to keep Decimal parsing fast downstream.
        frame[row][column] = {
            l: Math.round(lch.coords[0] ?? 0) / 100,
            c: Math.round(lch.coords[1] ?? 0),
            h: Math.round(lch.coords[2] ?? 0),
        };
    }
    return frame;
}

export default class Camera extends TemporalStreamValue<ListValue, LCHFrame> {
    feed: CameraFeed;
    lastTime: DOMHighResTimeStamp | undefined = undefined;
    frequency: number;
    width: number;
    height: number;
    lastDevice: string | null;

    constructor(
        evaluation: Evaluation,
        width: number,
        height: number,
        frequency: number,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Camera,
            Camera.createFrame(evaluation.getCreator(), []),
            [],
        );

        this.width = width;
        this.height = height;
        this.frequency = frequency;
        this.lastDevice = this.evaluator.database.Settings.getCamera();
        this.feed = new CameraFeed(
            this.evaluator.database,
            width,
            height,
            frequency,
            () => this.handleCameraDenied(),
        );
    }

    private handleCameraDenied() {
        denyConsent(Permission.Camera);
        this.evaluator.replaceMainValue(
            new PermissionException(
                this.creator,
                this.evaluator,
                Permission.Camera,
            ),
        );
        this.evaluator.broadcast();
    }

    configure(width: number, height: number, frequency: number) {
        this.width = width;
        this.height = height;
        this.frequency = frequency;
        this.feed.setResolution(width, height);
        const currentDevice = this.evaluator.database.Settings.getCamera();
        if (currentDevice !== this.lastDevice) {
            this.lastDevice = currentDevice;
            this.feed.setDevice();
        }
    }

    /** Take a raw frame and add a frame to the stream */
    react(raw: LCHFrame) {
        const ColorType = this.evaluator.project.shares.output.Color;

        // Convert the raw frame into a value.
        const rows: StructureValue[][] = raw.map((row) =>
            row.map((color) => {
                const bindings = new Map<Names, Value>();
                bindings.set(
                    ColorType.inputs[0].names,
                    new NumberValue(this.creator, color.l),
                );
                bindings.set(
                    ColorType.inputs[1].names,
                    new NumberValue(this.creator, color.c),
                );
                bindings.set(
                    ColorType.inputs[2].names,
                    new NumberValue(this.creator, color.h),
                );
                return createStructure(this.evaluator, ColorType, bindings);
            }),
        );

        this.add(Camera.createFrame(this.creator, rows), raw);
    }

    tick(time: DOMHighResTimeStamp) {
        if (
            this.lastTime !== undefined &&
            time - this.lastTime < this.frequency
        )
            return;

        const image = this.feed.grabImageData();
        if (image === undefined) return;

        this.lastTime = time;
        this.react(imageDataToLCH(image));
    }

    static createFrame(
        creator: Expression,
        colors: StructureValue[][],
    ): ListValue {
        return new ListValue(
            creator,
            colors.map((row) => new ListValue(creator, row)),
        );
    }

    start() {
        this.feed.start();
    }

    stop() {
        this.feed.stop();
    }

    getType() {
        return NumberType.make();
    }
}

const DEFAULT_FREQUENCY = 100;
const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;

export function createCameraDefinition(
    locales: Locales,
    ColorType: StructureDefinition,
) {
    const frameType = ListType.make(
        ListType.make(new StructureType(ColorType)),
    );

    const WidthBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.width.doc),
        getNameLocales(locales, (locale) => locale.input.Camera.width.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_WIDTH, Unit.reuse(['px'])),
    );

    const HeightBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.height.doc),
        getNameLocales(locales, (locale) => locale.input.Camera.height.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_HEIGHT, Unit.reuse(['px'])),
    );

    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.frequency.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Camera.frequency.names,
        ),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Camera.doc),
        getNameLocales(locales, (locale) => locale.input.Camera.names),
        [WidthBind, HeightBind, FrequencyBind],
        createStreamEvaluator(
            frameType.clone(),
            Camera,
            (evaluation) =>
                new Camera(
                    evaluation,
                    evaluation.get(WidthBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_WIDTH,
                    evaluation.get(HeightBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_HEIGHT,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                ),
            (stream, evaluation) => {
                stream.configure(
                    evaluation.get(WidthBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_WIDTH,
                    evaluation.get(HeightBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_HEIGHT,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                );
            },
        ),
        frameType.clone(),
    );
}
