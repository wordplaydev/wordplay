import None from './None';
import Primitive from './Primitive';
import type Value from './Value';
import type LanguageCode from '@locale/LanguageCode';
import type Evaluator from './Evaluator';
import type { StepNumber } from './Evaluator';
import type { NativeTypeName } from '../native/NativeConstants';
import type Locale from '@locale/Locale';
import type StreamDefinition from '../nodes/StreamDefinition';
import type Expression from '../nodes/Expression';
import concretize from '../locale/locales/concretize';

export const MAX_STREAM_LENGTH = 256;

export default abstract class Stream<
    ValueType extends Value = Value
> extends Primitive {
    /** The evaluator that processes this stream */
    readonly evaluator: Evaluator;

    /** The definition of this stream type */
    readonly definition: StreamDefinition;

    /** The stream of values */
    values: { value: ValueType; stepIndex: StepNumber }[] = [];

    /** Listeners watching this stream */
    reactors: ((stream: Stream) => void)[] = [];

    constructor(
        evaluator: Evaluator,
        definition: StreamDefinition,
        initalValue: ValueType
    ) {
        super(evaluator.getMain());

        this.evaluator = evaluator;
        this.definition = definition;

        this.add(initalValue);
    }

    getDescription(translation: Locale) {
        return concretize(
            translation,
            this.definition.docs
                ?.getLocale(translation.language)
                ?.getFirstParagraph() ?? translation.term.stream
        );
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

    at(requestor: Expression, index: number): Value {
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
        return this.getName(languages);
    }

    getName(languages: LanguageCode[]) {
        return this.definition.names.getLocaleText(languages);
    }

    /** Should return named values on the stream. */
    resolve(): Value | undefined {
        return undefined;
    }

    /** Should start whatever is necessary to start listening to data stream. */
    abstract start(): void;

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;

    getSize() {
        let sum = 0;
        for (const value of this.values) sum += value.value.getSize();
        return sum;
    }
}
