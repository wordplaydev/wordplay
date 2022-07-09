import type Node from "./Node";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Type from "./Type";
import type Docs from "./Docs";
import type Program from "./Program";
import type Conflict from "./Conflict";

export default class Conversion extends Expression {

    readonly docs: Docs[];
    readonly convert: Token;
    readonly output: Type;
    readonly expression: Expression;

    constructor(docs: Docs[], convert: Token, output: Type, expression: Expression) {
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

    getConflicts(program: Program): Conflict[] { return []; }

}