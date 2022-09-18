import { SET_NATIVE_TYPE_NAME, SET_TYPE_VAR_NAME } from "../native/NativeConstants";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class SetType extends Type {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly close: Token;

    constructor(open?: Token, close?: Token, key?: Type | Unparsable) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, [ TokenType.SET_OPEN ]);
        this.key = key;
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, [ TokenType.SET_CLOSE ]);
    }

    computeChildren() {
        const children = [];
        children.push(this.open);
        if(this.key) children.push(this.key);
        children.push(this.close);
        return children;
    }
    computeConflicts() {}

    isCompatible(type: Type, context: Context): boolean { 
        return  type instanceof SetType &&
            (
                // If there is no key type, then must both have no key type.
                (this.key === undefined && type.key === undefined) ||
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    this.key instanceof Type &&
                    type.key instanceof Type &&
                    this.key.isCompatible(type.key, context)
                )
            ); 
    }

    getNativeTypeName(): string { return SET_NATIVE_TYPE_NAME; }

    getDefinition(name: string, context: Context, node: Node) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(name, context, node); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new SetType(
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token ], original, replacement), 
            this.key?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement)
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === SET_TYPE_VAR_NAME && this.key instanceof Type ? this.key : undefined;
    };

}