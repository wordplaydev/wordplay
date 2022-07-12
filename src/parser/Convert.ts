import type Node from "./Node";
import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";

export default class Convert extends Expression {
    
    readonly expression: Expression;
    readonly type: Type | Unparsable;

    constructor(expression: Expression, type: Type | Unparsable) {
        super();

        this.expression = expression;
        this.type = type;
    }

    getChildren() { return [ this.expression, this.type ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        // Whatever this converts to.
        return this.type instanceof Type ? this.type : new UnknownType(this);
    }

}