import type { NativeTypeName } from "../native/NativeConstants";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";
import type TypeSet from "./TypeSet";
import type TypeVariable from "./TypeVariable";

export default class VariableType extends Type {

    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
        
    }

    getGrammar() { return []; }

    computeConflicts() {}

    /** All types are concrete unless noted otherwise. */
    isGeneric() { return true; }

    acceptsAll(types: TypeSet) { 
        return types.list().every(type => type instanceof VariableType && type.definition == this.definition); }

    getNativeTypeName(): NativeTypeName { return "variable"; }

    getDefinitionOfName() { return undefined; }

    toWordplay() { return this.definition.toWordplay(); }

    replace() { return new VariableType(this.definition) as this; }

    
    
    

    getDescriptions(): Translations {
        return {
            eng: "A variable type type",
            "😀": `${TRANSLATE} •x?`
        }
    }

}