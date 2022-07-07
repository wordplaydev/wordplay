import Node from "./Node";
import type { Token } from "./Token";

export default class Measurement extends Node {
    
    readonly number: Token;
    readonly unit?: Token;

    constructor(number: Token, unit?: Token) {
        super();
        this.number = number;
        this.unit = unit;
    }

    getChildren() { return this.unit !== undefined ? [ this.number, this.unit ] : [ this.number ]; }

}