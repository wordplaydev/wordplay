import type Conflict from "./Conflict";
import type Docs from "./Docs";
import Expression from "./Expression";
import type Program from "./Program";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class Documented extends Expression {
    
    readonly docs: Docs[];
    readonly expression: Expression | Unparsable;

    constructor(docs: Docs[], expression: Expression | Unparsable) {
        super();
        this.docs = docs;
        this.expression = expression;
    }

    getChildren() { return [ ...this.docs, this.expression ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return this.expression instanceof Unparsable ? new UnknownType(this) : this.expression.getType(program);
    }

}