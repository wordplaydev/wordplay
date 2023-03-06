import type Evaluator from '@runtime/Evaluator';
import TemporalStream from '../runtime/TemporalStream';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';
import MeasurementType from '../nodes/MeasurementType';
import Bind from '../nodes/Bind';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import NoneType from '../nodes/NoneType';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Measurement from '../runtime/Measurement';
import createStreamEvaluator from './createStreamEvaluator';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import List from '../runtime/List';
import ListType from '../nodes/ListType';
import { ColorType } from '../output/Color';
import type Expression from '../nodes/Expression';
import ColorJS from 'colorjs.io';
import Structure, { createStructure } from '../runtime/Structure';

type CameraConfig = {
    stream: MediaStream;
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
};

export default class Camera extends TemporalStream<List> {
    config: CameraConfig | undefined | null;
    lastTime: DOMHighResTimeStamp | undefined = undefined;
    frequency: number;
    width: number;
    height: number;
    stopped: boolean = false;

    constructor(
        evaluator: Evaluator,
        width: number,
        height: number,
        frequency: number
    ) {
        super(
            evaluator,
            CameraDefinition,
            Camera.createFrame(evaluator.getMain(), [])
        );

        this.width = width;
        this.height = height;
        this.frequency = frequency;
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
                    // Draw the frame in the top left of the canvas
                    0,
                    0,
                    // Crop the image to fit the requested aspect ratio into the given aspect ratio
                    // Scale the image to the desired size
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
                const rows: Structure[][] = [];
                for (let i = 0; i < image.data.length; i += 4) {
                    const index = i / 4;
                    const row = Math.floor(index / image.height);
                    const column = index % image.width;
                    if (rows[row] === undefined) rows[row] = [];

                    // Create a ColorJS wrapper from the sRGB values.
                    const srgb = new ColorJS('srgb', [
                        image.data[i] / 255,
                        image.data[i + 1] / 255,
                        image.data[i + 2] / 255,
                    ]);
                    // Get an LCH color from it.
                    const lch = srgb.to('lch');
                    // Create bindings from it.
                    const bindings = new Map();
                    // Lightness
                    bindings.set(
                        ColorType.inputs[0],
                        new Measurement(this.creator, lch.coords[0] / 100)
                    );
                    // Chroma
                    bindings.set(
                        ColorType.inputs[1],
                        new Measurement(this.creator, lch.coords[1])
                    );
                    // Hue
                    bindings.set(
                        ColorType.inputs[2],
                        new Measurement(this.creator, lch.coords[2])
                    );

                    // Convert it to a Color value.
                    const value = createStructure(
                        this.evaluator,
                        ColorType,
                        bindings
                    );

                    // SaveConvert the color to an LCH Color and store at the appropriate place in the matrix.
                    rows[row][column] = value;
                }

                // Add the frame to the stream
                this.add(Camera.createFrame(this.creator, rows));
            }
        }
    }

    static createFrame(creator: Expression, colors: Structure[][]): List {
        return new List(
            creator,
            colors.map((row) => new List(creator, row))
        );
    }

    start() {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices == 'undefined'
        )
            return;

        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
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
                    // First, create a video tag to render the stream to
                    // and a canvas on which to render the video.
                    const config: CameraConfig = {
                        video: document.createElement('video'),
                        canvas,
                        context,
                        stream,
                        width: settings.width,
                        height: settings.height,
                    };

                    // Set the video stream's source to the camera.
                    config.canvas.width = this.width;
                    config.canvas.height = this.height;

                    // Hide the video and canvas.
                    config.canvas.style.display = 'none';
                    config.video.style.display = 'none';

                    // Save the config
                    this.config = config;

                    config.video.srcObject = stream;

                    document.body.appendChild(config.video);
                    document.body.appendChild(config.canvas);

                    // Start the video
                    config.video.play();
                } else this.config = null;
            })
            .catch(() => {
                this.config = null;
            });
    }

    stop() {
        this.stopped = true;
        if (this.config) {
            document.body.removeChild(this.config.canvas);
            document.body.removeChild(this.config.video);
        }
    }

    getType() {
        return MeasurementType.make();
    }
}

const DEFAULT_FREQUENCY = 100;
const DEFAULT_WIDTH = 32;
const DEFAULT_HEIGHT = 32;

export const frameType = ListType.make(
    ListType.make(new StructureDefinitionType(ColorType))
);

const WidthBind = Bind.make(
    getDocTranslations((t) => t.input.camera.width.doc),
    getNameTranslations((t) => t.input.camera.width.name),
    UnionType.make(MeasurementType.make(Unit.make(['px'])), NoneType.make()),
    MeasurementLiteral.make(DEFAULT_WIDTH, Unit.make(['px']))
);

const HeightBind = Bind.make(
    getDocTranslations((t) => t.input.camera.height.doc),
    getNameTranslations((t) => t.input.camera.height.name),
    UnionType.make(MeasurementType.make(Unit.make(['px'])), NoneType.make()),
    MeasurementLiteral.make(DEFAULT_HEIGHT, Unit.make(['px']))
);

const FrequencyBind = Bind.make(
    getDocTranslations((t) => t.input.camera.frequency.doc),
    getNameTranslations((t) => t.input.camera.frequency.name),
    UnionType.make(MeasurementType.make(Unit.make(['ms'])), NoneType.make()),
    MeasurementLiteral.make(DEFAULT_FREQUENCY, Unit.make(['ms']))
);

export const CameraDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.camera.doc),
    getNameTranslations((t) => t.input.camera.name),
    [WidthBind, HeightBind, FrequencyBind],
    createStreamEvaluator(
        frameType.clone(),
        Camera,
        (evaluation) =>
            new Camera(
                evaluation.getEvaluator(),
                evaluation.get(WidthBind.names, Measurement)?.toNumber() ??
                    DEFAULT_FREQUENCY,
                evaluation.get(HeightBind.names, Measurement)?.toNumber() ??
                    DEFAULT_WIDTH,
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber() ??
                    DEFAULT_HEIGHT
            ),
        (stream, evaluation) => {
            stream.frequency =
                evaluation.get(WidthBind.names, Measurement)?.toNumber() ??
                DEFAULT_WIDTH;
            stream.frequency =
                evaluation.get(HeightBind.names, Measurement)?.toNumber() ??
                DEFAULT_HEIGHT;
            stream.frequency =
                evaluation.get(FrequencyBind.names, Measurement)?.toNumber() ??
                DEFAULT_FREQUENCY;
        }
    ),
    frameType.clone()
);
