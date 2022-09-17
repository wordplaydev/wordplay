import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import Node, { type ConflictContext } from "./Node";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    abstract isCompatible(type: Type, context: ConflictContext): boolean;
    abstract getNativeTypeName(): string;

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return context.native?.getConversion(this.getNativeTypeName(), context, type);
    }

    getFunction(context: ConflictContext, name: string): FunctionDefinition | undefined {
        return context.native?.getFunction(this.getNativeTypeName(), name);
    }

    resolveTypeVariable(name: string): Type | undefined { return undefined };

}