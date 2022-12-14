import Type from "./Type";
import type ConversionDefinition from "./ConversionDefinition";
import type Context from "./Context";
import type StructureDefinition from "./StructureDefinition";
import NameType from "./NameType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export const STRUCTURE_NATIVE_TYPE_NAME = "structure";

export default class StructureType extends Type {

    readonly structure: StructureDefinition;

    constructor(definition: StructureDefinition) {

        super();

        this.structure = definition;
    }

    getGrammar() { return []; }

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
            return this.accepts(int.getType(context), context);
        }) !== undefined;
    }

    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {
        return this.structure.getConversion(context, input, output);
    }

    getAllConversions() {
        return this.structure.getAllConversions();
    }
  
    getNativeTypeName(): string { return STRUCTURE_NATIVE_TYPE_NAME; }

    replace() { return new StructureType(this.structure) as this; }

    toWordplay() { return this.structure.getNames()[0]; }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A structure type"
        }
    }

}