import type Conflict from "./Conflict";
import type Conversion from "./Conversion";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class SetOrMapType extends Type {

    readonly open?: Token;
    readonly key: Type | Unparsable;
    readonly close?: Token;
    readonly bind?: Token;
    readonly value?: Type | Unparsable;

    constructor(key: Type | Unparsable, value?: Type | Unparsable, open?: Token, close?: Token, bind?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;
        this.bind = bind;
        this.value = value;
    }

    isMap() { return this.bind !== undefined; }

    getChildren() {
        const children = [];
        if(this.open) children.push(this.open);
        children.push(this.key);
        if(this.close) children.push(this.close);
        if(this.bind) children.push(this.bind);
        if(this.value) children.push(this.value);
        return children;
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean { 
        return  type instanceof SetOrMapType &&
                this.key instanceof Type &&
                type.key instanceof Type &&
                this.key.isCompatible(program, type.key) &&
                (
                    (this.value === undefined && type.value === undefined) ||
                    (this.value !== undefined && type.value !== undefined && this.value instanceof Type && type.value instanceof Type && this.value.isCompatible(program, type.value))
                ); 
    }

    getConversion(program: Program, type: Type): Conversion | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}