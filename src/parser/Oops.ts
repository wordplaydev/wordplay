import type { Token } from "./Token";
import Expression from "./Expression";

export default class Oops extends Expression {
    
    readonly error: Token;
    readonly name: Token;

    constructor(error: Token, name: Token) {
        super();

        this.error = error;
        this.name = name;
    }

    getChildren() { return [ this.error, this.name ]; }

}