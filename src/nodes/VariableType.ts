import type Translations from "./Translations";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";

export default class VariableType extends Type {

    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
    }

    computeChildren() { return []; }
    computeConflicts() {}

    accepts(type: Type) { return type instanceof VariableType && type.definition == this.definition; }

    getNativeTypeName(): string { return "variable"; }

    getDefinitionOfName() { return undefined; }

    toWordplay() { return this.definition.name.getText()}

    clone() { return new VariableType(this.definition) as this; }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            eng: "A variable type type",
            "😀": `TODO: •x?`
        }
    }


}