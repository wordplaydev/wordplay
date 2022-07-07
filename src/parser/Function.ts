import type Node from "./Node";
import type Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Type from "./Type";
import type TypeVariables from "./TypeVariables";
import type Unparsable from "./Unparsable";

export default class Function extends Expression {

    readonly fun: Token;
    readonly typeVars?: TypeVariables|Unparsable;
    readonly open: Token;
    readonly inputs: (Bind|Unparsable)[];
    readonly close: Token;
    readonly dot?: Token;
    readonly output?: Type;
    readonly expression: Expression;

    constructor(fun: Token, open: Token, inputs: (Bind|Unparsable)[], close: Token, expression: Expression, typeVars?: TypeVariables|Unparsable, dot?: Token, output?: Type) {
        super();

        this.fun = fun;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.output = output;
        this.expression = expression;
    }

    getChildren() {
        let children: Node[] = [ this.fun ];
        if(this.typeVars) children.push(this.typeVars);
        children.push(this.open);
        children = children.concat(this.inputs);
        children.push(this.close);
        if(this.dot) children.push(this.dot);
        if(this.output) children.push(this.output);
        children.push(this.expression);
        return children;
    }

    toWordplay(): string {
        return `${this.fun.toWordplay()}${this.fun.toWordplay()}${this.inputs.map(i => i.toWordplay())}${this.close.toWordplay()}${this.expression.toWordplay()}`
    }

}