import type Conflict from "../parser/Conflict";
import type Program from "./Program";
import Type from "./Type";

export default class ConversionType extends Type {

    readonly output: Type;
    
    constructor(output: Type) {
        super();
        this.output = output;
    }

    getChildren() { return [ this.output ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof ConversionType && type.output.isCompatible(program, this.output);
    }

}