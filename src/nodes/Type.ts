import type ConversionDefinition from "./ConversionDefinition";
import Node, { type ConflictContext } from "./Node";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    abstract isCompatible(context: ConflictContext, type: Type): boolean;

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined { return undefined; }

}