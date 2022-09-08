import Node from "./Node";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";
import type StructureDefinition from "./StructureDefinition";

export default class StructureType extends Type {

    readonly definition: StructureDefinition;

    constructor(definition: StructureDefinition) {

        super();

        this.definition = definition;
    }

    computeChildren() {
        if(this.definition instanceof Node)
            return [ this.definition ];
        else 
            return [];
    }

    getBind(name: string) { return this.definition.getBind(name); }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof StructureType && this.definition === type.definition;
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.definition.getConversion(context, type);
    }

    getNativeTypeName(): string { return "structure"; }

}