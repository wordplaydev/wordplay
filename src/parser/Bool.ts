import Expression from "./Expression";
import type { Token } from "./Token";

export default class Bool extends Expression {
    
    readonly value: Token;

    constructor(value: Token) {
        super();
        this.value = value;
    }

    getChildren() { return [ this.value ]; }

}