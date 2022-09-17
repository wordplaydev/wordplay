import Node from "./Node";
import Token from "./Token";
import { SyntacticConflict } from "../parser/Parser"
import type Conflict from "../conflicts/Conflict";
import type Evaluable from "../runtime/Evaluable";
import type Value from "../runtime/Value";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import UnknownType from "./UnknownType";
import { UnparsableConflict } from "../conflicts/UnparsableConflict";

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
    getTypeUnlessCycle() { return new UnknownType(this); }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${SyntacticConflict[this.reason]}`;
    }

    getConflicts(): Conflict[] {
        // All syntax errors are conflicts
        return [ new UnparsableConflict(this) ];
    }

    compile(): Step[] {
        return [ new Halt(new Exception(this, ExceptionKind.UNPARSABLE), this) ];
    }

    evaluate(): Value {
        return new Exception(this, ExceptionKind.UNPARSABLE);
    }

    clone(original?: Node, replacement?: Node) { 
        return new Unparsable(
            this.reason, 
            this.parsedNodes.map(n => n.cloneOrReplace([ Node ], original, replacement)), 
            this.unparsableTokens.map(t => t.cloneOrReplace([ Token ], original, replacement))
        ) as this; 
    }

}


