import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import type { ConflictContext } from "./Node";
import { Placeholder } from "../conflicts/Placeholder";
import Halt from "../runtime/Halt";

export default class ExpressionPlaceholder extends Expression {
    
    readonly etc: Token;

    constructor(etc: Token) {
        super();
        this.etc = etc;
    }

    computeChildren() { return [ this.etc ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
        return [ new Placeholder(this) ];
    }

    getType(context: ConflictContext): Type { return new UnknownType(this); }

    compile(context: ConflictContext):Step[] {
        return [ new Halt(new Exception(this, ExceptionKind.PLACEHOLDER), this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(this, ExceptionKind.PLACEHOLDER);
    }

}