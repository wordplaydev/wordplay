import type Translations from "../nodes/Translations";
import { STREAM_NATIVE_TYPE_NAME } from "../nodes/StreamType";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";
import type LanguageCode from "../nodes/LanguageCode";
import Names from "../nodes/Names";
import Docs from "../nodes/Docs";
import type Node from "../nodes/Node";
import type Evaluator from "./Evaluator";
import type { StepNumber } from "./Evaluator";

const HISTORY_LIMIT = 256;

export default abstract class Stream<ValueType extends Value = Value> extends Primitive {

    /** The evalutor that processes this stream */
    readonly evaluator: Evaluator;

    /** Documentation on this stream */
    docs: Docs;

    /** The names of this stream */
    names: Names;

    /** The stream of values */
    values: { value: ValueType, stepIndex: StepNumber}[] = [];

    /** Listeners watching this stream */
    reactors: ((stream: Stream)=>void)[] = [];

    constructor(evaluator: Evaluator, docs: Docs | Translations, names: Names | Translations, initalValue: ValueType) {
        super(evaluator.getMain());

        this.evaluator = evaluator;
        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.names = names instanceof Names ? names : new Names(names);
        this.add(initalValue);
    }
    
    getDescriptions(): Translations { return this.docs.getTranslations(); }

    getNames() { return this.names.getNames(); }
    getTranslation(languages: LanguageCode[]): string { return this.names.getTranslation(languages); }

    hasName(name: string) { return this.names.hasName(name); }

    isEqualTo(value: Value): boolean {
        return value === this;
    }

    add(value: ValueType, silent: boolean = false) {

        // Ignore values during stepping.
        if(this.evaluator.isStepping())
            return;

        // Update the time.
        this.values.push({ value: value, stepIndex: this.evaluator.getStepIndex() });

        // Limit the array to 1000 values to avoid leaking memory.
        const oldest = Math.max(0, this.values.length - HISTORY_LIMIT);
        this.values = this.values.slice(oldest, oldest + HISTORY_LIMIT);

        // Notify subscribers of the state change.
        if(!silent)
            this.notify();

    }

    getNativeTypeName(): string { return STREAM_NATIVE_TYPE_NAME; }

    getFirstStepIndex() { return this.values[0].stepIndex; }

    latest(): ValueType { 
        // Find the last value prior to the current evaluator index.
        // Note that streams always have a starting value, so it should never be possible that the filter is empty.
        return this.values.filter(val => val.stepIndex <= this.evaluator.getStepIndex()).at(-1)?.value as ValueType;
    }

    at(requestor: Node, index: number): Value {

        // Get the latest value (based on the current evaluator time)
        const latest = this.latest();

        // Find the position of the latest value.
        let position = this.values.findIndex(val => val.value === latest);

        // Step back -index- number of times.
        position -= index;

        // Return the value at the position.
        return position >= 0 && position < this.values.length ? this.values[position].value : new None(requestor);

    }

    listen(listener: (stream: Stream)=>void) {
        this.reactors.push(listener);
    }

    ignore(listener: (stream: Stream)=> void) {
        this.reactors = this.reactors.filter(l => l !== listener);
    }

    notify() {
        // Tell each reactor that this stream changed.
        this.reactors.forEach(reactor => reactor(this));
    }

    /** Should produce valid Wordplay code string representing the stream's name */
    toWordplay(languages: LanguageCode[]): string { return this.names.getTranslation(languages); };

    /** Should return named values on the stream. */
    resolve(): Value | undefined { return undefined; }

    /** Should start whatever is necessary to start listening to data stream. */
    abstract start(): void;

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;

}