import { LIST_NATIVE_TYPE_NAME, LIST_TYPE_VAR_NAME } from "../native/NativeConstants";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { getPossibleTypes } from "./getPossibleTypes";
import { Position } from "./Node";
import type Transform from "./Transform"

export default class ListType extends NativeType {

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

    getDescriptions() {
        return {
            eng: "A list type"
        }
    }

    getChildReplacements(child: Node, context: Context, position: Position): Transform[]  {

        if(position === Position.ON && child === this.type)
            return getPossibleTypes(this, context);
        
        return [];

    }

}