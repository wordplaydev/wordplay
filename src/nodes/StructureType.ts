import Node from "./Node";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";
import StructureDefinition from "./StructureDefinition";
import type NativeStructureDefinition from "../native/NativeStructureDefinition";

export default class StructureType extends Type {

    readonly definition: StructureDefinition | NativeStructureDefinition;

    constructor(definition: StructureDefinition | NativeStructureDefinition) {

        super();

        this.definition = definition;
    }

    getChildren() {
        if(this.definition instanceof Node)
            return [ this.definition ];
        else 
            return [];
    }

    getBind(name: string) { return this.definition instanceof StructureDefinition ? this.definition.getBind(name) : undefined; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof StructureType && this.definition === type.definition;
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.definition instanceof StructureDefinition ? this.definition.getConversion(context, type) : undefined;
    }

    getNativeTypeName(): string { return "structure"; }

}