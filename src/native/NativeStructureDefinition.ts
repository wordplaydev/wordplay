import type Docs from "../nodes/Docs";
import FunctionType from "../nodes/FunctionType";
import StructureType from "../nodes/StructureType";
import type TypeVariable from "../nodes/TypeVariable";
import type StructureDefinitionInterface from "./StructureDefinitionInterface";

export default class NativeStructureDefinition implements StructureDefinitionInterface {

    readonly docs: Docs[];
    readonly typeVars: TypeVariable[];

    constructor(docs: Docs[], typeVars: (TypeVariable)[]) {

        this.docs = docs;
        this.typeVars = typeVars;

    }

    getFunctionType(): FunctionType { return new FunctionType([], new StructureType(this)); }
    isInterface() { return false; }
    getInputs() { return []; }

}