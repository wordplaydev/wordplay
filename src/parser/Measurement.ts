import type Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
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

    getConflicts(program: Program): Conflict[] { return []; }

}