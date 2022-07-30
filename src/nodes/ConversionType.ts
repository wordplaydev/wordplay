import type Conflict from "../parser/Conflict";
import type { ConflictContext } from "./Node";
import type Program from "./Program";
import Type from "./Type";

export default class ConversionType extends Type {

    readonly output: Type;
    
    constructor(output: Type) {
        super();
        this.output = output;
    }

    getChildren() { return [ this.output ]; }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof ConversionType && type.output.isCompatible(context, this.output);
    }

}