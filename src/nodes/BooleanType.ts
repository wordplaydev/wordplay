import type Conflict from "../conflicts/Conflict";
import type Token from "./Token";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";

export default class BooleanType extends Type {

    readonly type?: Token;

    constructor(type?: Token) {
        super();

        this.type = type;
    }

    getChildren() {
        return this.type === undefined ? [] : [ this.type ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type) { return type instanceof BooleanType; }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

    toWordplay() { return "•?"; }

}