import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TEXT_SYMBOL } from "../parser/Tokenizer";
import AnyType from "./AnyType";
import Language from "./Language";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";

export default class TextType extends Type {

    readonly quote: Token;
    readonly format?: Language;

    constructor(quote?: Token, format?: Language) {
        super();

        this.quote = quote ?? new Token(TEXT_SYMBOL, [ TokenType.TEXT_TYPE ]);
        this.format = format;
    }

    computeChildren() {
        const children = [];
        if(this.quote) children.push(this.quote);
        if(this.format) children.push(this.format);
        return children;
    }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return type instanceof AnyType ||  
                (type instanceof TextType && 
                ((this.format === undefined && type.format === undefined) || 
                 (this.format !== undefined && type.format !== undefined && this.format.isCompatible(type.format)))); 
    }

    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    getDefinition(context: ConflictContext, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new TextType(
            this.quote.cloneOrReplace([ Token ], original, replacement), 
            this.format?.cloneOrReplace([ Language, undefined ], original, replacement)
        ) as this; 
    }

}