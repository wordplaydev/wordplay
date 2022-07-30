import type Reaction from "../nodes/Reaction";
import Stream from "./Stream";
import type Value from "./Value";

export default class ReactionStream extends Stream {

    readonly reaction: Reaction;

    constructor(reaction: Reaction, initialValue: Value) {
        super({"eng": "reaction"}, initialValue);

        this.reaction = reaction;
    }

    start(): void {}
    stop() {}
    getType() { return this.values[0].getType(); }

}