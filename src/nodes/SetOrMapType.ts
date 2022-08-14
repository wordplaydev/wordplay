import type Conflict from "../conflicts/Conflict";
import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class SetOrMapType extends Type {

    readonly open?: Token;
    readonly key?: Type | Unparsable;
    readonly bind?: Token;
    readonly value?: Type | Unparsable;
    readonly close?: Token;

    constructor(open?: Token, close?: Token, key?: Type | Unparsable, bind?: Token, value?: Type | Unparsable) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;
        this.bind = bind;
        this.value = value;
    }

    isMap() { return this.bind !== undefined || this.value instanceof Type; }

    getChildren() {
        const children = [];
        if(this.open) children.push(this.open);
        if(this.key) children.push(this.key);
        if(this.close) children.push(this.close);
        if(this.bind) children.push(this.bind);
        if(this.value) children.push(this.value);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return  type instanceof SetOrMapType &&
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

    getNativeTypeName(): string { return this.isMap() ? "map" : "set"; }

}