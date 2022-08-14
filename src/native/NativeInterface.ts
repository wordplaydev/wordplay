import type ConversionDefinition from "../nodes/ConversionDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type { ConflictContext } from "../nodes/Node";
import type Type from "../nodes/Type";

export default interface NativeInterface {
    getConversion(kind: string, context: ConflictContext, type: Type): ConversionDefinition | undefined;
    getFunction(kind: string, name: string): FunctionDefinition | undefined;
}