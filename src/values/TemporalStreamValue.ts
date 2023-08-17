import StreamValue from '@values/StreamValue';
import type Value from '@values/Value';

export default abstract class TemporalStreamValue<
    Kind extends Value,
    Raw
> extends StreamValue<Kind, Raw> {
    abstract tick(
        time: DOMHighResTimeStamp,
        delta: number,
        multiplier: number
    ): void;
}
