import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import Node from "./Node";
import type Context from "./Context";
import type Expression from "./Expression";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    /**
     * True if the given type can be bound to this type, in the given program context.
     */
    abstract accepts(type: Type, context: Context, expression?: Expression): boolean;
    abstract getNativeTypeName(): string;

    /** All types are concrete unless noted otherwise. */
    isGeneric() { return false; }

    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {
        return context.native.getConversion(this.getNativeTypeName(), context, input, output);
    }

    getAllConversions(context: Context) {
       return context.native === undefined ? [] : context.native.getAllConversions(this.getNativeTypeName());
    }

    getFunction(context: Context, name: string): FunctionDefinition | undefined {
        return context.native.getFunction(this.getNativeTypeName(), name);
    }

    resolveTypeVariable(name: string): Type | undefined { name; return undefined };

}