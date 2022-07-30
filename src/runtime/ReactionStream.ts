import Stream from "./Stream";
import type Value from "./Value";

export default class ReactionStream extends Stream {

    constructor(initialValue: Value) {
        super({"eng": "reaction"}, initialValue);
    }

    start(): void {}
    stop() {}

}