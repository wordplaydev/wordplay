import Node from "./Node";
import type { Token } from "./Token";
import { SyntacticConflict } from "./Parser"
import Conflict from "./Conflict";

export default class Unparsable extends Node {
    
    readonly reason: SyntacticConflict;
    readonly lineBefore: Token[];
    readonly lineAfter: Token[];

    constructor(reason: SyntacticConflict, lineBefore: Token[], lineAfter: Token[]) {
        super();

        this.reason = reason;
        this.lineBefore = lineBefore;
        this.lineAfter = lineAfter;
    }

    getChildren() { return this.lineAfter.slice() }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${SyntacticConflict[this.reason]}`;
    }

    getConflicts(): Conflict[] {
        // All syntax errors are conflicts
        return [ new Conflict(this, this) ];
    }

}