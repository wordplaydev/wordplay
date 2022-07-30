import StreamStructureType from "../native/StreamStructureType";
import type { LanguageCode } from "../nodes/LanguageCode";
import type { Named } from "../nodes/Named";
import Value from "./Value";

export default abstract class Stream extends Value implements Named {

    /** The stream of values */
    values: Value[] = [];

    listeners: ((stream: Stream)=>void)[] = [];

    readonly names: Record<LanguageCode,string>;

    constructor(names: Record<LanguageCode, string>, initalValue: Value) {
        super();

        this.names = names;
        this.add(initalValue);
    }

    add(value: Value) {

        // Update the time.
        this.values.push(value);

        // Limit the array to 1000 ticks to avoid leaking memory.
        this.values.splice(0, Math.max(0, this.values.length - 1000));

        // Notify subscribers of the state change.
        this.notify();

    }
    
    latest() { return this.values[this.values.length - 1]; }

    listen(listener: (stream: Stream)=>void) {
        this.listeners.push(listener);
    }

    ignore(listener: (stream: Stream)=> void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    notify() {
        this.listeners.forEach(listener => listener.call(undefined, this));
    }

    getType() { return StreamStructureType; }

    /** Should produce valid Wordplay code string representing the stream's name */
    toString() { return this.names["eng"]; };

    getNames() { return Object.values(this.names); }

    /** Should return named values on the stream. */
    resolve(name: string): Value | undefined {

        switch(name) {
            case "∂": return this.values[this.values.length - 2];
            default: return undefined;
        }
        
    }

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;

}