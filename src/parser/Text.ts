import type Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
import type { Token } from "./Token";

export default class Text extends Node {
    
    readonly text: Token;
    readonly format?: Token;

    constructor(text: Token, format?: Token) {
        super();
        this.text = text;
        this.format = format;
    }

    getChildren() { return this.format !== undefined ? [ this.text, this.format ] : [ this.text ]; }

    getConflicts(program: Program): Conflict[] { return []; }

}