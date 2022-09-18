import { MAP_KEY_TYPE_VAR_NAME, MAP_NATIVE_TYPE_NAME, MAP_VALUE_TYPE_VAR_NAME } from "../native/NativeConstants";
import { BIND_SYMBOL, SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";

export default class MapType extends Type {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly bind: Token;
    readonly value?: Type | Unparsable;
    readonly close: Token;

    constructor(open?: Token, close?: Token, key?: Type | Unparsable, bind?: Token, value?: Type | Unparsable) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, [ TokenType.SET_OPEN ]);
        this.key = key;
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, [ TokenType.SET_CLOSE ]);
        this.bind = bind ?? new Token(BIND_SYMBOL, [ TokenType.SET_CLOSE ]);
        this.value = value;
    }

    computeChildren() {
        const children = [];
        children.push(this.open);
        if(this.key) children.push(this.key);
        children.push(this.bind);
        if(this.value) children.push(this.value);
        children.push(this.close);
        return children;
    }
    computeConflicts() {}

    isCompatible(type: Type, context: Context): boolean { 
        return  type instanceof MapType &&
            (
                // If there is no key type, then must both have no key type.
                (this.key === undefined && type.key === undefined) ||
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    this.key instanceof Type &&
                    type.key instanceof Type &&
                    this.key.isCompatible(type.key, context) &&
                    (
                        (this.value === undefined && type.value === undefined) ||
                        (this.value !== undefined && type.value !== undefined && this.value instanceof Type && type.value instanceof Type && this.value.isCompatible(type.value, context))
                    )
                )
            ); 
    }

    getNativeTypeName(): string { return MAP_NATIVE_TYPE_NAME; }

    getDefinition(name: string, context: Context, node: Node) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(name, context, node); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new MapType(
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.close.cloneOrReplace([ Token], original, replacement), 
            this.key?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement), 
            this.bind.cloneOrReplace([ Token ], original, replacement), 
            this.value?.cloneOrReplace([ Type, Unparsable ], original, replacement)
        ) as this; 
    }

    resolveTypeVariable(name: string): Type | undefined { 
        return name === MAP_KEY_TYPE_VAR_NAME && this.key instanceof Type ? this.key : 
            name === MAP_VALUE_TYPE_VAR_NAME && this.value instanceof Type ? this.value :
            undefined;
    };

}