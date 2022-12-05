import MeasurementType from "../nodes/MeasurementType";
import { TRANSLATE } from "../nodes/Translations";
import Unit from "../nodes/Unit";
import type Evaluator from "../runtime/Evaluator";
import Measurement from "../runtime/Measurement";
import Stream from "../runtime/Stream";

export const FREQUENCY = 33;

export default class Time extends Stream {

    timerID: NodeJS.Timer | undefined;
    startTime: number | undefined;

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            {
                eng: "A stream of clock ticks, thirty times per second.",
                "😀": TRANSLATE
            }, 
            {
                "😀": "⏱",
                eng: "time"
            },
            new Measurement(evaluator.getMain(), 0, Unit.unit(["ms"]))
        );
    }

    start() {

        if(this.timerID !== undefined) return;

        // Remmember when time starts so that we can start counting from program start.
        this.startTime = Date.now();

        this.timerID = setInterval(
            // Add a time measurement on each tick.
            () => this.add(new Measurement(this.creator, Date.now() - (this.startTime as number), Unit.unit(["ms"]))),            
            // Tick every 33 milliseconds, trying to achieve a 30 fps frame rate.
            FREQUENCY
        );

    }

    stop() {

        // Stop the timer.
        if(this.timerID !== undefined)
            clearInterval(this.timerID);

    }

    getType() { return new MeasurementType(undefined, Unit.unit(["ms"])); }

}