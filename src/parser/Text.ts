import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import TextType from "./TextType";
import type { Token } from "./Token";
import type Type from "./Type";

export default class Text extends Expression {
    
    readonly text: Token;
    readonly format?: Token;

    constructor(text: Token, format?: Token) {
        super();
        this.text = text;
        this.format = format;
    }

    getChildren() { return this.format !== undefined ? [ this.text, this.format ] : [ this.text ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new TextType(undefined, this.format);
    }

}