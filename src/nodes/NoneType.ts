import type Conflict from "../parser/Conflict";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";
import type Program from "./Program";
import type Token from "./Token";
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

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean { 
        return type instanceof NoneType && (
            (this.name === undefined && type.name === undefined ) || 
            (this.name !== undefined && type.name !== undefined && this.name.text === type.name.text)
        );
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}