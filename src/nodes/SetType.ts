import { SET_NATIVE_TYPE_NAME, SET_TYPE_VAR_NAME } from "../native/NativeConstants";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { getPossibleTypes } from "./getPossibleTypes";
import type Reference from "./Reference";

export default class SetType extends NativeType {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly close: Token;

    constructor(key?: Type | Unparsable, open?: Token, close?: Token) {
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

    accepts(type: Type, context: Context): boolean { 
        // If they have one, then they must be compable, and if there is a value type, they must be compatible.
        return  type instanceof SetType &&
                (
                    // If the key type isn't specified, any will do.
                    this.key === undefined ||
                    (
                    this.key instanceof Type &&
                    type.key instanceof Type &&
                    this.key.accepts(type.key, context)
                    )
                );
    }

    getNativeTypeName(): string { return SET_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { 
        return new SetType(
            this.key?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement),
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === SET_TYPE_VAR_NAME && this.key instanceof Type ? this.key : undefined;
    };

    getDescriptions() {
        return {
            eng: "A set type"
        }
    }

    getChildReplacements(child: Node, context: Context): (Node | Reference<Node>)[]  {

        if(child === this.key)
            return getPossibleTypes(this, context);
        else return [];

    }

}