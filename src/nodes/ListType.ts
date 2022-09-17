import { LIST_NATIVE_TYPE_NAME, LIST_TYPE_VAR_NAME } from "../native/NativeConstants";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open: Token;
    readonly type?: Type | Unparsable;
    readonly close: Token;

    constructor(type?: Type | Unparsable, open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(LIST_OPEN_SYMBOL, [ TokenType.LIST_OPEN ]);
        this.type = type;
        this.close = close ?? new Token(LIST_CLOSE_SYMBOL, [ TokenType.LIST_CLOSE ]);
    }

    computeConflicts() {}

    computeChildren() { 
        const children = [];
        children.push(this.open);
        if(this.type) children.push(this.type);
        children.push(this.close);
        return children;
    }

    isCompatible(type: Type, context: Context): boolean {
        return type instanceof ListType && 
            (
                type.type === undefined || 
                (this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(type.type, context))
            );
    }

    getNativeTypeName(): string { return LIST_NATIVE_TYPE_NAME; }

    getDefinition(context: Context, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new ListType(
            this.type?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement),
            this.open.cloneOrReplace([ Token ], original, replacement),
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === LIST_TYPE_VAR_NAME && this.type instanceof Type ? this.type : undefined;
    };

}