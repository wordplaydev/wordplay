import { LIST_NATIVE_TYPE_NAME, LIST_TYPE_VAR_NAME } from "../native/NativeConstants";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import type Transform from "../transforms/Transform"
import TypePlaceholder from "./TypePlaceholder";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";

export default class ListType extends NativeType {

    readonly open: Token;
    readonly type?: Type | Unparsable;
    readonly close: Token;

    constructor(type?: Type | Unparsable, open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(LIST_OPEN_SYMBOL, TokenType.LIST_OPEN);
        this.type = type;
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, TokenType.LIST_CLOSE);
    }

    computeConflicts() {}

    computeChildren() { 
        const children = [];
        children.push(this.open);
        if(this.type !== undefined) children.push(this.type);
        children.push(this.close);
        return children;
    }

    accepts(type: Type, context: Context): boolean {
        return type instanceof ListType && 
            (
                // If this list type has no type specified, any will do.
                this.type === undefined || 
                // If the given type has no type specified, any will do
                type.type === undefined ||
                (this.type instanceof Type && type.type instanceof Type && this.type.accepts(type.type, context))
            );
    }

    getNativeTypeName(): string { return LIST_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new ListType(
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable, undefined ], "type", this.type, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === LIST_TYPE_VAR_NAME && this.type instanceof Type ? this.type : undefined;
    };

    getDescriptions(): Translations {
        return {
            "😀": "TODO",
            eng: "A list type"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        if(child === this.type)
            return getPossibleTypeReplacements(child, context);
    }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.type) return new Replace(context.source, child, new TypePlaceholder());
    }
}