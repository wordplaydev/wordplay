import type Conflict from "../conflicts/Conflict";
import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open?: Token;
    readonly type?: Type | Unparsable;
    readonly close?: Token;

    constructor(open?: Token, close?: Token, type?: Type | Unparsable) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() { 
        const children = [];
        if(this.open) children.push(this.open);
        if(this.type) children.push(this.type);
        if(this.close) children.push(this.close);
        return children;    
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof ListType && (type.type === undefined || (this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(context, type.type)));
    }

    getNativeTypeName(): string { return "list"; }

}