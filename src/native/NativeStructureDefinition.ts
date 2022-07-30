import type Docs from "../nodes/Docs";
import type TypeVariable from "../nodes/TypeVariable";
import type { StructureDefinitionInterface } from "./StructureDefinitionInterface";

export default class NativeStructureDefinition implements StructureDefinitionInterface {

    readonly docs: Docs[];
    readonly typeVars: TypeVariable[];

    constructor(docs: Docs[], typeVars: (TypeVariable)[]) {

        this.docs = docs;
        this.typeVars = typeVars;

    }

}