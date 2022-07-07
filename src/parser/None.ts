import type { Token } from "./Token";
import Expression from "./Expression";

export default class None extends Expression {
    
    readonly none: Token;
    readonly name: Token;

    constructor(error: Token, name: Token) {
        super();

        this.none = error;
        this.name = name;
    }

    getChildren() { return [ this.none, this.name ]; }

}