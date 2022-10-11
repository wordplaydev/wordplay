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

    getDefinition() { return undefined; }

    toWordplay() { return this.definition.name.getText()}

    clone() { return new VariableType(this.definition) as this; }

    getDescriptions() {
        return {
            eng: "A variable type type"
        }
    }

}