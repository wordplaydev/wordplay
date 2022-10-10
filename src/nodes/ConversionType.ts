import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
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

    accepts(type: Type, context: Context): boolean {
        return type instanceof ConversionType && this.output.accepts(type.output, context);
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new ConversionType(this.output.cloneOrReplace([ Type ], original, replacement)) as this; }

}