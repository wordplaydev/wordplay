import Type from "./Type";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import type TypeVariable from "./TypeVariable";

export default class VariableType extends Type {

    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
    }

    computeChildren() { return []; }

    isCompatible(context: ConflictContext, type: Type) { return type instanceof VariableType && type.definition == this.definition; }

    getNativeTypeName(): string { return "variable"; }

    getDefinition(context: ConflictContext, node: Node, name: string) { return undefined; }

    toWordplay() { return this.definition.name.getText()}

    clone(original?: Node, replacement?: Node) { return new VariableType(this.definition) as this; }

}