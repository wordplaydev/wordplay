import type Context from "../nodes/Context";
import type Reaction from "../nodes/Reaction";
import { TRANSLATE } from "../nodes/Translations";
import Stream from "./Stream";
import type Value from "./Value";

export default class ReactionStream extends Stream {

    readonly reaction: Reaction;

    constructor(reaction: Reaction, initialValue: Value) {
        super(
            reaction,
            {
                eng: "A stream of values based on other streams.",
                "😀": TRANSLATE
            }, 
            {
                eng: "reaction",
                "😀": "∆"
            },
            initialValue
        );

        this.reaction = reaction;
    }

    start(): void {}
    stop() {}
    getType(context: Context) { return this.values[0].getType(context); }

}