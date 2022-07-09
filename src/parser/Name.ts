import Expression from "./Expression";
import type { Token } from "./Token";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    getChildren() { return [ this.name ]; }

}