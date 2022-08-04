import Node from "./Node";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";
import StructureDefinition from "./StructureDefinition";
import type NativeStructureDefinition from "../native/NativeStructureDefinition";

export default class StructureType extends Type {

    readonly type: StructureDefinition | NativeStructureDefinition;

    constructor(type: StructureDefinition | NativeStructureDefinition) {

        super();

        this.type = type;
    }

    getChildren() {
        if(this.type instanceof Node)
            return [ this.type ];
        else 
            return [];
    }

    getBind(name: string) { return this.type instanceof StructureDefinition ? this.type.getBind(name) : undefined; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof StructureType && this.type === type.type;
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.type instanceof StructureDefinition ? this.type.getConversion(context, type) : undefined;
    }

}