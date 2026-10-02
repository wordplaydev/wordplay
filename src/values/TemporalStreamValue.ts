import StreamValue from '#values/StreamValue.ts';
import type Value from '#values/Value.ts';

export default abstract class TemporalStreamValue<
    Kind extends Value,
    Raw,
> extends StreamValue<Kind, Raw> {
    abstract tick(
        time: DOMHighResTimeStamp,
        delta: number,
        multiplier: number,
    ): void;
}
