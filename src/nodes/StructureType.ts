import Node from "./Node";
import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type Context from "./Context";
import type StructureDefinition from "./StructureDefinition";
import NameType from "./NameType";
import Unparsable from "./Unparsable";

export const STRUCTURE_NATIVE_TYPE_NAME = "structure";

export default class StructureType extends Type {

    readonly structure: StructureDefinition;

    constructor(definition: StructureDefinition) {

        super();

        this.structure = definition;
    }

    computeChildren() {
        if(this.structure instanceof Node)
            return [ this.structure ];
        else 
            return [];
    }

    computeConflicts() { return []; }

    getDefinition(name: string) { return this.structure.getDefinition(name); }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    accepts(type: Type, context: Context): boolean {

        // If the given type is a name type, is does it refer to this type's structure definition?
        if(type instanceof NameType)
            type = type.getType(context);

        if(!(type instanceof StructureType)) return false;
        if(this.structure === type.structure) return true;
        // Are any of the given type's interfaces compatible with this?
        return type.structure.interfaces.find(int => {
            let interfaceType = int.type;
            if(interfaceType instanceof Unparsable) return false;
            if(interfaceType instanceof NameType) interfaceType = interfaceType.getType(context);
            return this.accepts(interfaceType, context);
        }) !== undefined;
    }

    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {
        return this.structure.getConversion(context, input, output);
    }

    getAllConversions() {
        return this.structure.getAllConversions();
    }
  
    getNativeTypeName(): string { return STRUCTURE_NATIVE_TYPE_NAME; }

    clone() { return new StructureType(this.structure) as this; }
    
    getDescriptions() {
        return {
            eng: "A structure type"
        }
    }

}