import Value from "./Value";

export default abstract class Stream extends Value {

    // Any listeners that are garbage collected are removed during notification.
    listeners: ((stream: Stream)=>void)[] = [];

    readonly name: string;

    constructor(name: string) {
        super();

        this.name = name;
    }
    
    listen(listener: (stream: Stream)=>void) {
        this.listeners.push(listener);
    }

    ignore(listener: (stream: Stream)=> void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    notify() {
        this.listeners.forEach(listener => listener.call(undefined, this));
    }

    /** Should produce valid Wordplay code string representing the stream's name */
    toString() { return this.name; };

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;

    /** Should return named values on the stream. */
    abstract resolve(name: string): Value | undefined;


}