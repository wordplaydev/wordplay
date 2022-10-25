import MeasurementType from "../nodes/MeasurementType";
import type Translations from "../nodes/Translations";
import Unit from "../nodes/Unit";
import type Evaluator from "../runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";

export const FREQUENCY = 33;

export default class Time extends Stream {

    timerID: NodeJS.Timer | undefined;
    startTime: number | undefined;

    constructor(evaluator: Evaluator) {
        super(evaluator, new Measurement(0, Unit.unit(["ms"])));
    }

    getTranslations(): Translations {
        return {
            "😀": "⏱",
            eng: "time"
        };
    }

    tick() {
        this.add(new Measurement(Date.now() - (this.startTime as number), Unit.unit(["ms"])));
    }

    start() {

        // Remmember when time starts so that we can start counting from program start.
        this.startTime = Date.now();

        // Tick every 33 milliseconds, trying to achieve a 30 fps frame rate.
        this.timerID = setInterval(() => this.tick(), FREQUENCY);

    }

    stop() {

        // Stop the timer.
        if(this.timerID !== undefined)
            clearInterval(this.timerID);

    }

    getType() { return new MeasurementType(undefined, Unit.unit(["ms"])); }

}