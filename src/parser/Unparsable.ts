import Node from "./Node";
import type { Token } from "./Token";
import { ErrorMessage } from "./Parser"

export default class Unparsable extends Node {
    
    readonly reason: ErrorMessage;
    readonly tokens: Token[];

    constructor(reason: ErrorMessage, tokens: Token[]) {
        super();

        this.reason = reason;
        this.tokens = tokens;
    }

    getChildren() { return this.tokens.slice() }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${ErrorMessage[this.reason]}`;
    }

}