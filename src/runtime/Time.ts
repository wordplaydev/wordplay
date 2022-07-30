import Unit from "../nodes/Unit";
import Measurement from "./Measurement";
import Stream from "./Stream";

export default class Time extends Stream {

    times: number[] = [];
    timerID: NodeJS.Timer | undefined;
    startTime: number | undefined;

    constructor() {
        super({"eng": "⏱"}, new Measurement(0, new Unit(["ms"])));
    }

    tick() {
        this.add(new Measurement(Date.now() - (this.startTime as number), new Unit(["ms"])));
    }

    start() {

        // Remmember when time starts so that we can start counting from program start.
        this.startTime = Date.now();

        // Tick every 33 milliseconds, trying to achieve a 30 fps frame rate.
        this.timerID = setInterval(() => this.tick(), 33);

    }

    stop() {

        // Stop the timer.
        if(this.timerID !== undefined)
            clearInterval(this.timerID);

    }

}