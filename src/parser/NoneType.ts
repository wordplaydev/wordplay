import type Conflict from "./Conflict";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";

export default class NoneType extends Type {

    readonly none: Token;
    readonly name?: Token;

    constructor(none: Token, name?: Token) {
        super();

        this.none = none;
        this.name = name;
    }

    getChildren() {
        return this.name ? [ this.none, this.name ] : [ this.none ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(type: Type): boolean { 
        return type instanceof NoneType && (
            (this.name === undefined && type.name === undefined ) || 
            (this.name !== undefined && type.name !== undefined && this.name.text === type.name.text)
        );
    }
}