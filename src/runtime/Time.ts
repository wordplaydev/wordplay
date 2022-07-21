import Unit from "../nodes/Unit";
import Measurement from "./Measurement";
import Stream from "./Stream";
import type Value from "./Value";

export default class Time extends Stream {

    times: number[] = [];
    timerID: NodeJS.Timer;

    constructor() {
        super("time");

        // Tick every 33 milliseconds, trying to achieve a 30 fps frame rate.
        this.timerID = setInterval(() => this.tick(), 33);

    }

    tick() {

        // Update the time.
        this.times.push(Date.now());

        // Limit the array to 1000 ticks to avoid leaking memory.
        this.times.splice(0, Math.max(0, this.times.length - 1000));

        // Notify subscribers of the state change.
        this.notify();

    }

    getTime() { return this.times.length === 0 ? 0 : this.times[this.times.length - 1]; }
    getPreviousTime() { return this.times.length < 2 ? 0 : this.times[this.times.length - 2]; }
    getDelta() { return this.getTime() - this.getPreviousTime(); }

    stop() {

        // Stop the timer.
        clearInterval(this.timerID);

    }

    resolve(name: string): Value | undefined {

        switch(name) {
            case "now": return new Measurement(this.getTime(), new Unit(["ms"]));
            case "delta": return new Measurement(this.getDelta(), new Unit(["ms"]));
            default: return undefined;
        }
        
    }

}