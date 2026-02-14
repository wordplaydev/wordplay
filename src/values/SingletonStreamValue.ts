import StreamValue from '@values/StreamValue';
import type Value from '@values/Value';

/**
 * Represents an input source that is singular (e.g., Button, Key, Pointer, Chat),
 * whose values should be pooled together and reacted to all at once
 **/
export default abstract class SingletonStreamValue<
    Kind extends Value,
    Raw,
> extends StreamValue<Kind, Raw> {}
