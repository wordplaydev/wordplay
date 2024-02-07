/* eslint-disable @typescript-eslint/no-explicit-any */
import NoneValue from '@values/NoneValue';
import SimpleValue from './SimpleValue';
import type Value from '@values/Value';
import type Evaluator from '@runtime/Evaluator';
import type { StepNumber } from '@runtime/Evaluator';
import type { BasisTypeName } from '../basis/BasisConstants';
import type StreamDefinition from '../nodes/StreamDefinition';
import type Expression from '../nodes/Expression';
import ListValue from '@values/ListValue';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export const MAX_STREAM_LENGTH = 256;

export default abstract class StreamValue<
    ValueType extends Value = Value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Raw = any,
> extends SimpleValue {
    /** The evaluator that processes this stream */
    readonly evaluator: Evaluator;

    /** The definition of this stream type */
    readonly definition: StreamDefinition;

    /** The stream of values */
    values: { value: ValueType; stepIndex: StepNumber }[] = [];

    /** Listeners watching this stream */
    reactors: ((
        stream: StreamValue<Value, any>,
        raw: Raw,
        silent: boolean,
    ) => void)[] = [];

    constructor(
        evaluator: Evaluator,
        definition: StreamDefinition,
        initalValue: ValueType,
        initialRaw: Raw,
    ) {
        super(evaluator.getMain());

        this.evaluator = evaluator;
        this.definition = definition;

        this.add(initalValue, initialRaw);
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            this.definition.docs
                ?.getPreferredLocale(locales)
                ?.getFirstParagraph() ?? locales.get((l) => l.term.stream),
        );
    }

    isEqualTo(value: Value): boolean {
        return value === this;
    }

    /** Defines how the stream should process a raw input value from the past */
    abstract react(raw: Raw): void;

    add(value: ValueType, raw: Raw, silent = false) {
        // Ignore values during stepping.
        if (!this.evaluator.isReplayingInputs() && this.evaluator.isStepping())
            return;

        // Update the time.
        this.values.push({
            value,
            stepIndex: this.evaluator.getStepIndex(),
        });

        // Limit the array length to avoid leaking memory.
        const oldest = Math.max(0, this.values.length - MAX_STREAM_LENGTH);
        this.values = this.values.slice(oldest, oldest + MAX_STREAM_LENGTH);

        // Notify subscribers (almost certainly an Evaluator) of the state change.
        // Some streams are silent, like Random, and only generate values on demand.
        // We still notify, but rely on Evaluator to not react. It still needs
        // to know that it happened though, for replay.
        this.notify(raw, silent);
    }

    getBasisTypeName(): BasisTypeName {
        return 'stream';
    }

    getFirstStepIndex() {
        return this.values[0].stepIndex;
    }

    latest(): ValueType | undefined {
        const latest = this.latestEntry();

        // Find the last value prior to the current evaluator index.
        // Note that streams always have a starting value, so it should never be possible that the filter is empty.
        return latest?.value;
    }

    latestEntry(): { value: ValueType; stepIndex: StepNumber } | undefined {
        // Find the last value prior to the current evaluator index.
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
            : new NoneValue(requestor);
    }

    range(requestor: Expression, count: number): Value {
        return new ListValue(
            requestor,
            this.values
                .slice(this.values.length - count, this.values.length)
                .map((val) => val.value),
        );
    }

    listen(
        listener: (
            stream: StreamValue<Value, unknown>,
            raw: Raw,
            silent: boolean,
        ) => void,
    ) {
        this.reactors.push(listener);
    }

    ignore(
        listener: (
            stream: StreamValue<Value, unknown>,
            raw: Raw,
            silent: boolean,
        ) => void,
    ) {
        this.reactors = this.reactors.filter((l) => l !== listener);
    }

    notify(raw: Raw, silent: boolean) {
        // Tell each reactor that this stream changed.
        this.reactors.forEach((reactor) => reactor(this, raw, silent));
    }

    /** Should produce valid Wordplay code string representing the stream's name */
    toWordplay(locales?: Locales): string {
        return locales
            ? this.getPreferredName(locales)
            : this.definition.names.getNames()[0];
    }

    getPreferredName(locales: Locales) {
        return locales.getName(this.definition.names);
    }

    /** Should return named values on the stream. */
    resolve(): Value | undefined {
        return undefined;
    }

    getRepresentativeText(locales: Locales): string {
        return this.definition.getPreferredName(locales.getLocales());
    }

    /** Should start whatever is necessary to start listening to data stream. */
    abstract start(): void;

    /** Should do whatever cleanup is necessary to stop listening to a data stream */
    abstract stop(): void;

    getSize() {
        // Estimate based on most recent value.
        return this.values.length * (this.values.at(-1)?.value.getSize() ?? 0);
    }
}
