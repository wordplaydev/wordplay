import type Program from "./Program";
import type Conflict from "../parser/Conflict";
import Type from "./Type";
import type StructureDefinition from "./StructureDefinition";
import type Conversion from "./Conversion";

export default class StructureType extends Type {

    readonly type: StructureDefinition;

    constructor(type: StructureDefinition) {

        super();

        this.type = type;
    }

    getChildren() {
        return [ this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof StructureType && this.type === type.type;
    }

    getConversion(program: Program, type: Type): Conversion | undefined {
        return this.type.getConversion(program, type);
    }

}