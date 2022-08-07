import type ConversionDefinition from "./ConversionDefinition";
import type FunctionDefinition from "./FunctionDefinition";
import Node, { type ConflictContext } from "./Node";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    abstract isCompatible(context: ConflictContext, type: Type): boolean;

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined { return undefined; }
    getFunction(context: ConflictContext, name: string): FunctionDefinition | undefined { return undefined; }

}