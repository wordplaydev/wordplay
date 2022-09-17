import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import AnyType from "./AnyType";
import type Context from "./Context";
import type Node from "./Node";
import Type from "./Type";

export default class ConversionType extends Type {

    readonly output: Type;
    
    constructor(output: Type) {
        super();
        this.output = output;
    }

    computeChildren() { return [ this.output ]; }
    computeConflicts() {}
    isCompatible(type: Type, context: Context): boolean {
        if(type instanceof AnyType) return true;
        return type instanceof ConversionType && type.output.isCompatible(this.output, context);
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new ConversionType(this.output.cloneOrReplace([ Type ], original, replacement)) as this; }

}