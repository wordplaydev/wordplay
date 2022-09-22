import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Placeholder from "../conflicts/Placeholder";
import Halt from "../runtime/Halt";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";

export default class ExpressionPlaceholder extends Expression {
    
    readonly etc: Token;

    constructor(etc: Token) {
        super();
        this.etc = etc;
    }

    computeChildren() { return [ this.etc ]; }

    computeConflicts(): Conflict[] { 
        return [ new Placeholder(this) ];
    }

    computeType(): Type { return new UnknownType(this); }

    compile():Step[] {
        return [ new Halt(new Exception(this, ExceptionKind.PLACEHOLDER), this) ];
    }

    evaluate(): Value {
        return new Exception(this, ExceptionKind.PLACEHOLDER);
    }

    clone(original?: Node, replacement?: Node) { 
        return new ExpressionPlaceholder(this.etc.cloneOrReplace([ Token ], original, replacement)) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

}