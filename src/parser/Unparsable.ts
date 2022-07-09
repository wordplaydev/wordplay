import Node from "./Node";
import type { Token } from "./Token";
import { ErrorMessage } from "./Parser"

export default class Unparsable extends Node {
    
    readonly reason: ErrorMessage;
    readonly lineBefore: Token[];
    readonly lineAfter: Token[];

    constructor(reason: ErrorMessage, lineBefore: Token[], lineAfter: Token[]) {
        super();

        this.reason = reason;
        this.lineBefore = lineBefore;
        this.lineAfter = lineAfter;
    }

    getChildren() { return this.lineAfter.slice() }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${ErrorMessage[this.reason]}`;
    }

}