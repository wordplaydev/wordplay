import type Conflict from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import TextType from "./TextType";
import type { Token } from "./Token";
import type Type from "./Type";

export default class Template extends Expression {
    
    readonly parts: (Token|Expression)[];
    readonly format?: Token;

    constructor(parts: (Token|Expression)[], format?: Token) {
        super();

        this.parts = parts;
        this.format = format;
    }

    getChildren() { return this.format ? [ ...this.parts, this.format ] : [ ...this.parts ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    getType(program: Program): Type {
        return new TextType(undefined, this.format);
    }

}