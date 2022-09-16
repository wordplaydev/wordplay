import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import AnyType from "./AnyType";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Type from "./Type";

export default class ConversionType extends Type {

    readonly output: Type;
    
    constructor(output: Type) {
        super();
        this.output = output;
    }

    computeChildren() { return [ this.output ]; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        if(type instanceof AnyType) return true;
        return type instanceof ConversionType && type.output.isCompatible(context, this.output);
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new ConversionType(this.output.cloneOrReplace([ Type ], original, replacement)) as this; }

}