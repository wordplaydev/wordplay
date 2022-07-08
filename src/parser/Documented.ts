import type Docs from "./Docs";
import Expression from "./Expression";

export default class Documented extends Expression {
    
    readonly docs: Docs[];
    readonly expression: Expression;

    constructor(docs: Docs[], expression: Expression) {
        super();
        this.docs = docs;
        this.expression = expression;
    }

    getChildren() { return [ ...this.docs, this.expression ]; }

}