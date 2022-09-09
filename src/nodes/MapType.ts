import type { ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class MapType extends Type {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly bind?: Token;
    readonly value?: Type | Unparsable;
    readonly close: Token;

    constructor(open?: Token, close?: Token, key?: Type | Unparsable, bind?: Token, value?: Type | Unparsable) {
        super();

        this.open = open ?? new Token("{", [ TokenType.SET_OPEN ]);
        this.key = key;
        this.close = close ?? new Token("}", [ TokenType.SET_CLOSE ]);
        this.bind = bind;
        this.value = value;
    }

    computeChildren() {
        const children = [];
        children.push(this.open);
        if(this.key) children.push(this.key);
        if(this.bind) children.push(this.bind);
        if(this.value) children.push(this.value);
        children.push(this.close);
        return children;
    }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return  type instanceof MapType &&
            (
                // If there is no key type, then must both have no key type.
                (this.key === undefined && type.key === undefined) ||
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    this.key instanceof Type &&
                    type.key instanceof Type &&
                    this.key.isCompatible(context, type.key) &&
                    (
                        (this.value === undefined && type.value === undefined) ||
                        (this.value !== undefined && type.value !== undefined && this.value instanceof Type && type.value instanceof Type && this.value.isCompatible(context, type.value))
                    )
                )
            ); 
    }

    getNativeTypeName(): string { return "map"; }

}