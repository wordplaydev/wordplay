import Node from "./Node";
import type Token from "./Token";
import { SyntacticConflict } from "../parser/Parser"
import Conflict, { UnparsableConflict } from "../parser/Conflict";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import UnknownType from "./UnknownType";

export default class Unparsable extends Node implements Evaluable {
    
    readonly reason: SyntacticConflict;
    readonly lineBefore: Token[];
    readonly lineAfter: Token[];

    constructor(reason: SyntacticConflict, lineBefore: Token[], lineAfter: Token[]) {
        super();

        this.reason = reason;
        this.lineBefore = lineBefore.slice();
        this.lineAfter = lineAfter.slice();
    }

    getChildren() { return this.lineAfter.slice() }

    getType() { return new UnknownType(this); }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${SyntacticConflict[this.reason]}`;
    }

    getConflicts(): Conflict[] {
        // All syntax errors are conflicts
        return [ new UnparsableConflict(this) ];
    }

    compile(): Step[] {
        return [ new Halt(new Exception(ExceptionType.UNPARSABLE), this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(ExceptionType.UNPARSABLE);
    }

}