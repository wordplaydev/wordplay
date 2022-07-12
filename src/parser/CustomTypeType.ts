import type Program from "./Program";
import type Conflict from "./Conflict";
import Type from "./Type";
import type CustomType from "./CustomType";

export default class CustomTypeType extends Type {

    readonly type: CustomType;

    constructor(type: CustomType) {
        super();

        this.type = type;
    }

    getChildren() {
        return [ this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof CustomTypeType && this.type === type.type;
    }

}