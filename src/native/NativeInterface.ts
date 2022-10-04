import type ConversionDefinition from "../nodes/ConversionDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Context from "../nodes/Context";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";

export default interface NativeInterface {
    getConversion(kind: string, context: Context, input: Type, output: Type): ConversionDefinition | undefined;
    getAllConversions(kind: string): ConversionDefinition[];
    getFunction(kind: string, name: string): FunctionDefinition | undefined;
    getStructureDefinition(kind: string): StructureDefinition | undefined;
}