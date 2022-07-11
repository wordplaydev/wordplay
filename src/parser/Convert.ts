import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";
import type Type from "./Type";

export default class Convert extends Expression {
    
    readonly expression: Expression;
    readonly type: Type;

    constructor(expression: Expression, type: Type) {
        super();

        this.expression = expression;
        this.type = type;
    }

    getChildren() { return [ this.expression, this.type ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}