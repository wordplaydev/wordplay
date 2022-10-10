import Node from "./Node";
import Token from "./Token";

export default class Dimension extends Node {

    readonly name: Token;
    readonly caret?: Token;
    readonly exponent?: Token;

    constructor(name: Token, caret?: Token, exponent?: Token) {
        super();

        this.name = name;
        this.caret = caret;
        this.exponent = exponent;

    }

    getName() { return this.name.getText(); }

    computeChildren() {
        const children = [ this.name ];
        if(this.caret) children.push(this.caret);
        if(this.exponent) children.push(this.exponent);
        return children;
    }

    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new Dimension(
            this.name.cloneOrReplace([ Token ], original, replacement), 
            this.caret?.cloneOrReplace([ Token ], original, replacement),
            this.exponent?.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}