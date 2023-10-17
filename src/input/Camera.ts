import type Evaluator from '@runtime/Evaluator';
import TemporalStreamValue from '../values/TemporalStreamValue';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import NumberType from '../nodes/NumberType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NoneType from '../nodes/NoneType';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberValue from '@values/NumberValue';
import createStreamEvaluator from './createStreamEvaluator';
import StructureType from '../nodes/StructureType';
import ListValue from '@values/ListValue';
import ListType from '../nodes/ListType';
import type Expression from '../nodes/Expression';
import ColorJS from 'colorjs.io';
import StructureValue, { createStructure } from '../values/StructureValue';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Names from '../nodes/Names';
import type Value from '../values/Value';
import type Locales from '../locale/Locales';

type CameraConfig = {
    stream: MediaStream;
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
    sourceX: number;
    sourceY: number;
    sourceWidth: number;
    sourceHeight: number;
};

type RawFrame = { l: number; c: number; h: number }[][];

export default class Camera extends TemporalStreamValue<ListValue, RawFrame> {
    config: CameraConfig | undefined | null;
    lastTime: DOMHighResTimeStamp | undefined = undefined;
    frequency: number;
    width: number;
    height: number;
    playing = false;
    stopped = false;

    constructor(
        evaluator: Evaluator,
        width: number,
        height: number,
        frequency: number
    ) {
        super(
            evaluator,
            evaluator.project.shares.input.Camera,
            Camera.createFrame(evaluator.getMain(), []),
            []
        );

        this.width = width;
        this.height = height;
        this.frequency = frequency;
    }

    /** Take a raw frame and add a frame to the stream */
    react(raw: RawFrame) {
        const ColorType = this.evaluator.project.shares.output.Color;

        // Convert the raw frame into a value.
        const rows: StructureValue[][] = raw.map((row) =>
            row.map((color) => {
                // Create bindings from it.
                const bindings = new Map<Names, Value>();

                // Lightness
                bindings.set(
                    ColorType.inputs[0].names,
                    new NumberValue(this.creator, color.l)
                );
                // Chroma
                bindings.set(
                    ColorType.inputs[1].names,
                    new NumberValue(this.creator, color.c)
                );
                // Hue
                bindings.set(
                    ColorType.inputs[2].names,
                    new NumberValue(this.creator, color.h)
                );
                // Convert it to a Color value.
                return createStructure(this.evaluator, ColorType, bindings);
            })
        );

        // Add the frame to the stream
        this.add(Camera.createFrame(this.creator, rows), raw);
    }

    tick(time: DOMHighResTimeStamp) {
        if (!this.config) return;

        // If the frequency has elapsed, add a value to the stream.
        if (
            this.lastTime === undefined ||
            time - this.lastTime >= this.frequency
        ) {
            this.lastTime = time;

            const context = this.config.canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: true,
            });
            if (context) {
                // Draw the current image from the camera to the canvas
                context.drawImage(
                    this.config.video,
                    // Render the cropped portion of the source image computed upon initialization
                    this.config.sourceX,
                    this.config.sourceY,
                    this.config.sourceWidth,
                    this.config.sourceHeight,
                    // Render the source to the full size of the canvas destination
                    0,
                    0,
                    this.width,
                    this.height
                );
                // Read the image
                const image = context.getImageData(
                    0,
                    0,
                    this.width,
                    this.height,
                    { colorSpace: 'srgb' }
                );

                // Translate the rows into a 2D array of colors
                const raw: { l: number; c: number; h: number }[][] = [];
                for (let i = 0; i < image.data.length; i += 4) {
                    const index = i / 4;
                    const row = Math.floor(index / image.width);
                    const column = index % image.width;
                    if (raw[row] === undefined) {
                        raw[row] = [];
                    }

                    // Create a ColorJS wrapper from the sRGB values.
                    const srgb = new ColorJS('srgb', [
                        image.data[i] / 255,
                        image.data[i + 1] / 255,
                        image.data[i + 2] / 255,
                    ]);
                    // Get an LCH color from it.
                    const lch = srgb.to('lch');

                    // PERF: We convert to integers to prevent
                    // Decimal from parsing as a string.

                    // Save the color to an LCH Color and store at the appropriate place in the matrix.
                    raw[row][column] = {
                        l: Math.round(lch.coords[0]) / 100,
                        c: Math.round(lch.coords[1]),
                        h: Math.round(lch.coords[2]),
                    };
                }

                this.react(raw);
            }
        }
    }

    static createFrame(
        creator: Expression,
        colors: StructureValue[][]
    ): ListValue {
        return new ListValue(
            creator,
            colors.map((row) => new ListValue(creator, row))
        );
    }

    start() {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices == 'undefined' ||
            this.config !== undefined
        )
            return;

        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    deviceId:
                        this.evaluator.database.Settings.getCamera() ??
                        undefined,
                    width: { min: this.width },
                    height: { min: this.height },
                    facingMode: 'user',
                    frameRate: { ideal: 1000 / this.frequency },
                },
            })
            .then((stream) => {
                if (this.stopped) return;
                const settings = stream.getVideoTracks()[0].getSettings();
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', {
                    alpha: false,
                    willReadFrequently: true,
                });

                if (settings && settings.width && settings.height && context) {
                    // Based on the camera size we received, determine the sub-rectangle
                    // we care about based on the requested size. The goal is to pick a rectangle that
                    // as the same aspect ratio as the requested size, cropping horizontally or
                    // vertically as necessary.
                    let sourceX, sourceY, sourceWidth, sourceHeight;
                    const sourceAspectRatio = settings.width / settings.height;
                    const targetAspectRatio = this.width / this.height;
                    // Fit to height
                    if (targetAspectRatio < sourceAspectRatio) {
                        sourceHeight = settings.height;
                        sourceWidth = settings.height * targetAspectRatio;
                        sourceX = 0 + (settings.width - sourceWidth) / 2;
                        sourceY = 0;
                    }
                    // Fit to width
                    else {
                        sourceWidth = settings.width;
                        sourceHeight = sourceWidth / targetAspectRatio;
                        sourceX = 0;
                        sourceY = 0 + (settings.height - sourceHeight) / 2;
                    }
                    // First, create a video tag to render the stream to
                    // and a canvas on which to render the video.
                    const config: CameraConfig = {
                        video: document.createElement('video'),
                        canvas,
                        context,
                        stream,
                        width: settings.width,
                        height: settings.height,
                        sourceX,
                        sourceY,
                        sourceWidth,
                        sourceHeight,
                    };

                    // Save the config
                    this.config = config;

                    // Set the video stream's source to the camera.
                    config.canvas.width = this.width;
                    config.canvas.height = this.height;

                    // Hide the video and canvas.
                    config.canvas.style.display = 'none';
                    config.video.style.display = 'none';

                    // Add them to the dom.
                    document.body.appendChild(config.video);
                    document.body.appendChild(config.canvas);

                    // Link the stream to the video tag
                    config.video.srcObject = stream;

                    // Start the video
                    config.video.play().then(() => (this.playing = true));
                } else this.config = null;
            })
            .catch(() => {
                this.config = null;
            });
    }

    stop() {
        this.stopped = true;
        if (this.config) {
            if (this.playing)
                this.config.stream.getTracks().forEach((track) => track.stop());
            this.config.video.srcObject = null;

            if (document.body.contains(this.config.canvas))
                document.body.removeChild(this.config.canvas);
            if (document.body.contains(this.config.video))
                document.body.removeChild(this.config.video);
        }
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
    ColorType: StructureDefinition
) {
    const frameType = ListType.make(
        ListType.make(new StructureType(ColorType))
    );

    const WidthBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.width.doc),
        getNameLocales(locales, (locale) => locale.input.Camera.width.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_WIDTH, Unit.reuse(['px']))
    );

    const HeightBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.height.doc),
        getNameLocales(locales, (locale) => locale.input.Camera.height.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_HEIGHT, Unit.reuse(['px']))
    );

    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Camera.frequency.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Camera.frequency.names
        ),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms']))
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
                    evaluation.getEvaluator(),
                    evaluation.get(WidthBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_FREQUENCY,
                    evaluation.get(HeightBind.names, NumberValue)?.toNumber() ??
                        DEFAULT_WIDTH,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_HEIGHT
                ),
            (stream, evaluation) => {
                stream.frequency =
                    evaluation.get(WidthBind.names, NumberValue)?.toNumber() ??
                    DEFAULT_WIDTH;
                stream.frequency =
                    evaluation.get(HeightBind.names, NumberValue)?.toNumber() ??
                    DEFAULT_HEIGHT;
                stream.frequency =
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY;
            }
        ),
        frameType.clone()
    );
}
