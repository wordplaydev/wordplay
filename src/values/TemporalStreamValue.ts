import StreamValue from '@values/StreamValue';
import type Value from '@values/Value';

export default abstract class TemporalStreamValue<
    Kind extends Value
> extends StreamValue<Kind> {
    abstract tick(
        time: DOMHighResTimeStamp,
        delta: number,
        multiplier: number
    ): void;
}
