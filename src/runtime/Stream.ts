import None from './None';
import Primitive from './Primitive';
import type Value from './Value';
import type LanguageCode from '../translation/LanguageCode';
import type Names from '../nodes/Names';
import type Docs from '../nodes/Docs';
import type Node from '../nodes/Node';
import type Evaluator from './Evaluator';
import type { StepNumber } from './Evaluator';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '../translation/Translation';

export const MAX_STREAM_LENGTH = 1024;

export default abstract class Stream<
    ValueType extends Value = Value
> extends Primitive {
    /** The evalutor that processes this stream */
    readonly evaluator: Evaluator;

    /** The stream of values */
    values: { value: ValueType; stepIndex: StepNumber }[] = [];

    /** Listeners watching this stream */
    reactors: ((stream: Stream) => void)[] = [];

    readonly names: Names;
    readonly docs: Docs;

    constructor(evaluator: Evaluator, initalValue: ValueType) {
        super(evaluator.getMain());

        this.evaluator = evaluator;
        this.add(initalValue);

        this.names = this.computeNames();
        this.docs = this.computeDocs();
    }

    abstract computeDocs(): Docs;
    abstract computeNames(): Names;

    getDescription(translation: Translation) {
        return (
            this.docs
                .getTranslation(translation.language)
                ?.getFirstParagraph() ?? translation.data.stream
        );
    }

    getNames() {
        return this.names.getNames();
    }

    getTranslation(languages: LanguageCode[]): string {
        return this.names.getTranslation(languages);
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    isEqualTo(value: Value): boolean {
        return value === this;
    }

    add(value: ValueType, silent: boolean = false) {
        // Ignore values during stepping.
        if (this.evaluator.isStepping()) return;

        // Update the time.
        this.values.push({
            value: value,
            stepIndex: this.evaluator.getStepIndex(),
        });

        // Limit the array length to avoid leaking memory.
        const oldest = Math.max(0, this.values.length - MAX_STREAM_LENGTH);
        this.values = this.values.slice(oldest, oldest + MAX_STREAM_LENGTH);

        // Notify subscribers of the state change.
        if (!silent) this.notify();
    }

    getNativeTypeName(): NativeTypeName {
        return 'stream';
    }

    getFirstStepIndex() {
        return this.values[0].stepIndex;
    }

    latest(): ValueType {
        // Find the last value prior to the current evaluator index.
        // Note that streams always have a starting value, so it should never be possible that the filter is empty.
        return this.latestEntry()?.value as ValueType;
    }

    latestEntry(): { value: ValueType; stepIndex: StepNumber } | undefined {
        // Find the last value prior to the current evaluator index.
        // Note that streams always have a starting value, so it should never be possible that the filter is empty.
        return this.values
            .filter((val) => val.stepIndex <= this.evaluator.getStepIndex())
            .at(-1);
    }

    at(requestor: Node, index: number): Value {
        // Get the latest value (based on the current evaluator time)
        const latest = this.latest();

        // Find the position of the latest value.
        let position = this.values.findIndex((val) => val.value === latest);

        // Step back -index- number of times.
        position -= index;

        // Return the value at the position.
        return position >= 0 && position < this.values.length
            ? this.values[position].value
            : new None(requestor);
    }

    listen(listener: (stream: Stream) => void) {
        this.reactors.push(listener);
    }

    ignore(listener: (stream: Stream) => void) {
        this.reactors = this.reactors.filter((l) => l !== listener);
    }

    notify() {
        // Tell each reactor that this stream changed.
        this.reactors.forEach((reactor) => reactor(this));
    }

    /** Should produce valid Wordplay code string representing the stream's name */
    toWordplay(languages: LanguageCode[]): string {
        return this.names.getTranslation(languages);
    }

    /** Should return named values on the stream. */
    resolve(): Value | undefined {
        return undefined;
    }

    /** Should start whatever is necessary to start listening to data stream. */
    abstract start(): void;

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;
}
