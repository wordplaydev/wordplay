import type Node from "./Node";
import type Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";
import type Type from "./Type";
import type TypeVariables from "./TypeVariables";
import type Unparsable from "./Unparsable";
import type Block from "./Block";

export default class CustomType extends Expression {

    readonly type: Token;
    readonly name: Token;
    readonly typeVars?: TypeVariables | Unparsable;
    readonly open: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close: Token;
    readonly block: Block | Unparsable;

    constructor(type: Token, name: Token, open: Token, inputs: (Bind|Unparsable)[], close: Token, block: Block | Unparsable, typeVars?: TypeVariables|Unparsable) {
        super();

        this.type = type;
        this.name = name;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.block = block;
    }

    getChildren() {
        let children: Node[] = [ this.type, this.name ];
        if(this.typeVars) children.push(this.typeVars);
        children = children.concat([ this.open, ...this.inputs, this.close, this.block ]);
        return children;
    }

    toWordplay(): string {
        return this.getChildren().map(c => c.toWordplay()).join("");
    }

}