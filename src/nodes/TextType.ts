import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TEXT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import Language from "./Language";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";
import { getPossibleLanguages } from "../transforms/getPossibleLanguages";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import Add from "../transforms/Add";

export default class TextType extends NativeType {

    readonly quote: Token;
    readonly format?: Language;

    constructor(quote?: Token, format?: Language) {
        super();

        this.quote = quote ?? new Token(TEXT_SYMBOL, TokenType.TEXT_TYPE);
        this.format = format;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new TextType(
            this.cloneOrReplaceChild(pretty, [ Token ], "quote", this.quote, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Language, undefined ], "format", this.format, original, replacement)
        ) as this; 
    }

    computeChildren() {
        const children = [];
        if(this.quote) children.push(this.quote);
        if(this.format) children.push(this.format);
        return children;
    }

    computeConflicts() {}

    accepts(type: Type): boolean { 
        return  (type instanceof TextType && 
                ((this.format === undefined && type.format === undefined) || 
                 (this.format !== undefined && type.format !== undefined && this.format.equals(type.format)))); 
    }

    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    getDescriptions() {
        return {
            eng: "A text type"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
    
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && child === this.format)
            return getPossibleLanguages(project).map(l => new Replace(context.source, child, new Language(l)));

    }
    
    getInsertionBefore() { return undefined; }
    
    getInsertionAfter(context: Context, position: number): Transform[] | undefined { 
        
        const project = context.source.getProject();
        // Formats can be any Language tags that are used in the project.
        if(project !== undefined && this.format === undefined)
            return getPossibleLanguages(project).map(l => new Add(context.source, position, this, "format", new Language(l)));

    }
    
}