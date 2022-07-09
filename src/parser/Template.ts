import type Conflict from "./Conflict";
import type Expression from "./Expression";
import Node from "./Node";
import type Program from "./Program";
import type { Token } from "./Token";

export default class Template extends Node {
    
    readonly parts: (Token|Expression)[];
    readonly format?: Token;

    constructor(parts: (Token|Expression)[], format?: Token) {
        super();

        this.parts = parts;
        this.format = format;
    }

    getChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}