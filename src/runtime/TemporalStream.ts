import Stream from './Stream';
import type Value from './Value';

export default abstract class TemporalStream<
    Kind extends Value
> extends Stream<Kind> {
    abstract tick(
        time: DOMHighResTimeStamp,
        delta: number,
        multiplier: number
    ): void;
}
