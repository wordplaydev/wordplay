import type Bind from "../nodes/Bind";
import type Docs from "../nodes/Docs";
import type { ConflictContext } from "../nodes/Node";
import type Node from "../nodes/Node";
import Type from "../nodes/Type";
import type TypeVariable from "../nodes/TypeVariable";
import type Conflict from "../parser/Conflict";
import type StructureDefinitionInterface from "./StructureDefinitionInterface";

export default class NativeStructureDefinition extends Type implements StructureDefinitionInterface {

    readonly docs: Docs[];
    readonly typeVars: TypeVariable[];

    constructor(docs: Docs[], typeVars: (TypeVariable)[]) {

        super();

        this.docs = docs;
        this.typeVars = typeVars;

    }

    isInterface() { return false; }
    getInputs(): Bind[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean { return type === this; }
    getChildren(): Node[] { return []; }
    getConflicts(context: ConflictContext): Conflict[] { return []; }

}