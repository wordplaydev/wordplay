import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class TextType extends Type {

    readonly quote: Token;
    readonly format?: Token;

    constructor(quote: Token, format?: Token) {
        super();

        this.quote = quote;
        this.format = format;
    }

    getChildren() {
        return this.format ? [ this.quote, this.format ] : [ this.quote ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}