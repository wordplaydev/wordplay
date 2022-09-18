import Node from "./Node";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type Context from "./Context";
import type StructureDefinition from "./StructureDefinition";
import NameType from "./NameType";
import Unparsable from "./Unparsable";

export const STRUCTURE_NATIVE_TYPE_NAME = "structure";

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

    computeConflicts() { return []; }

    getBind(name: string) { return this.definition.getBind(name); }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    isCompatible(type: Type, context: Context): boolean {
        if(!(type instanceof StructureType)) return false;
        if(this.definition === type.definition) return true;
        // Are any of this definition's interfaces compatible with the given type?
        return this.definition.interfaces.find(int => {
            let type = int.type;
            if(type instanceof Unparsable) return false;
            if(type instanceof NameType) type = type.getType(context);
            return type.isCompatible(type, context);
        }) !== undefined;
    }

    getConversion(context: Context, type: Type): ConversionDefinition | undefined {
        return this.definition.getConversion(context, type);
    }

    getNativeTypeName(): string { return STRUCTURE_NATIVE_TYPE_NAME; }

    clone() { return new StructureType(this.definition) as this; }
    
}