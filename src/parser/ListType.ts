import type Conflict from "./Conflict";
import type Conversion from "./Conversion";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open?: Token;
    readonly type: Type | Unparsable;
    readonly close?: Token;

    constructor(type: Type | Unparsable, open?: Token, close?: Token) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() { 
        const children = [];
        if(this.open) children.push(this.open);
        children.push(this.type);
        if(this.close) children.push(this.close);
        return children;    
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof ListType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(program, type.type);
    }

    getConversion(program: Program, type: Type): Conversion | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}