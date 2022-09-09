import type Conflict from "../conflicts/Conflict";
import type { ConflictContext } from "./Node";
import Token, { TokenType } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open: Token;
    readonly type?: Type | Unparsable;
    readonly close: Token;

    constructor(type?: Type | Unparsable, open?: Token, close?: Token) {
        super();

        this.open = open ?? new Token("[", [ TokenType.LIST_OPEN ]);
        this.type = type;
        this.close = close ?? new Token("]", [ TokenType.LIST_CLOSE ]);
    }

    computeChildren() { 
        const children = [];
        children.push(this.open);
        if(this.type) children.push(this.type);
        children.push(this.close);
        return children;    
    }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof ListType && (type.type === undefined || (this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(context, type.type)));
    }

    getNativeTypeName(): string { return "list"; }

}