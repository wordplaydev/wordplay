import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";

export default class BinaryOperation extends Expression {

    readonly operator: Token;
    readonly left: Expression;
    readonly right: Expression | Unparsable;

    constructor(operator: Token, left: Expression, right: Expression | Unparsable) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.operator, this.right ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new UnknownType(this);
    }

}