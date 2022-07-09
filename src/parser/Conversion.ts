import type Node from "./Node";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Type from "./Type";
import type Docs from "./Docs";

export default class Conversion extends Expression {

    readonly docs: Docs[];
    readonly convert: Token;
    readonly output: Type;
    readonly expression: Expression | Token;

    constructor(docs: Docs[], convert: Token, output: Type, expression: Expression | Token) {
        super();

        this.docs = docs;
        this.convert = convert;
        this.output = output;
        this.expression = expression;
    }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

}