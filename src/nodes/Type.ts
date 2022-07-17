import type ConversionDefinition from "./ConversionDefinition";
import Node from "./Node";
import type Program from "./Program";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    abstract isCompatible(program: Program, type: Type): boolean;

    getConversion(program: Program, type: Type): ConversionDefinition | undefined { return undefined; }

}