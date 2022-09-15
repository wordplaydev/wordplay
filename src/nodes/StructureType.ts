import Node from "./Node";
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

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    isCompatible(context: ConflictContext, type: Type): boolean {
        if(!(type instanceof StructureType)) return false;
        if(this.definition === type.definition) return true;
        // Are any of this definition's interfaces compatible with the given type?
        return this.definition.interfaces.find(int => int.getType(context)?.isCompatible(context, type)) !== undefined;

    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.definition.getConversion(context, type);
    }

    getNativeTypeName(): string { return "structure"; }

    clone(original?: Node, replacement?: Node) { return new StructureType(this.definition) as this; }
    
}