import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";
import { SyntacticConflict } from "../parser/Parser"
import Conflict from "../conflicts/Conflict";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import UnknownType from "./UnknownType";

export default class Unparsable extends Node implements Evaluable {
    
    readonly reason: SyntacticConflict;
    
    /* The nodes that were parsed before failing to parse the tokens that followed. */
    readonly parsedNodes: Node[];
    
    /* The tokens that weren't parsable */
    readonly unparsableTokens: Token[];

    constructor(reason: SyntacticConflict, parsedNodes: Node[], unparsableTokens: Token[]) {
        super();

        this.reason = reason;
        this.parsedNodes = parsedNodes.slice();
        this.unparsableTokens = unparsableTokens.slice();
    }

    computeChildren() { return this.unparsableTokens.slice() }

    getType() { return new UnknownType(this); }
    getTypeUnlessCycle(context: ConflictContext) { return new UnknownType(this); }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${SyntacticConflict[this.reason]}`;
    }

    getConflicts(): Conflict[] {
        // All syntax errors are conflicts
        return [ new UnparsableConflict(this) ];
    }

    compile(context: ConflictContext):Step[] {
        return [ new Halt(new Exception(this, ExceptionKind.UNPARSABLE), this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(this, ExceptionKind.UNPARSABLE);
    }

}

export class UnparsableConflict extends Conflict {
    readonly unparsable: Unparsable;

    constructor(unparsable: Unparsable) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return [ this.unparsable ];
    }

    getExplanations() { 
        return {
            eng: `I couldn't parse this.`
        }
    }

}
