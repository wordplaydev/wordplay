import type Conflict from "../conflicts/Conflict";
import type Language from "./Language";
import type { ConflictContext } from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";

export default class TextType extends Type {

    readonly quote: Token;
    readonly format?: Language;

    constructor(quote?: Token, format?: Language) {
        super();

        this.quote = quote ?? new Token("''", [ TokenType.TEXT_TYPE ]);
        this.format = format;
    }

    computeChildren() {
        const children = [];
        if(this.quote) children.push(this.quote);
        if(this.format) children.push(this.format);
        return children;
    }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return  type instanceof TextType && 
                ((this.format === undefined && type.format === undefined) || 
                 (this.format !== undefined && type.format !== undefined && this.format.isCompatible(type.format))); 
    }

    getNativeTypeName(): string { return "text"; }

}