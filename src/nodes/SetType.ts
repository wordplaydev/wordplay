import type { ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class SetType extends Type {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly close: Token;

    constructor(open?: Token, close?: Token, key?: Type | Unparsable) {
        super();

        this.open = open ?? new Token("{", [ TokenType.SET_OPEN ]);
        this.key = key;
        this.close = close ?? new Token("}", [ TokenType.SET_CLOSE ]);
    }

    computeChildren() {
        const children = [];
        children.push(this.open);
        if(this.key) children.push(this.key);
        children.push(this.close);
        return children;
    }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return  type instanceof SetType &&
            (
                // If there is no key type, then must both have no key type.
                (this.key === undefined && type.key === undefined) ||
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    this.key instanceof Type &&
                    type.key instanceof Type &&
                    this.key.isCompatible(context, type.key)
                )
            ); 
    }

    getNativeTypeName(): string { return "set"; }

}