import type Alias from "../nodes/Alias";
import type NativeInterface from "./NativeInterface";
import FunctionDefinition from "../nodes/FunctionDefinition";
import NativeExpression from "./NativeExpression";
import type Context from "../nodes/Context";
import type Type from "../nodes/Type";
import ConversionDefinition from "../nodes/ConversionDefinition";
import type Documentation from "../nodes/Documentation";
import type TypeVariable from "../nodes/TypeVariable";
import type Bind from "../nodes/Bind";
import Value from "../runtime/Value";
import type Evaluation from "../runtime/Evaluation";
import type StructureDefinition from "../nodes/StructureDefinition";
import TypeException from "../runtime/TypeException";
import { parseType, tokens } from "../parser/Parser";
import Unparsable from "../nodes/Unparsable";
import bootstrapNone from "./NoneNative";
import bootstrapBool from "./BoolNative";
import bootstrapText from "./TextNative";
import bootstrapList from "./ListNative";
import bootstrapMeasurement from "./MeasurementNative";
import bootstrapSet from "./SetNative";
import bootstrapMap from "./MapNative";
import Block from "../nodes/Block";
import { BOOLEAN_NATIVE_TYPE_NAME, LIST_NATIVE_TYPE_NAME, MAP_NATIVE_TYPE_NAME, MEASUREMENT_NATIVE_TYPE_NAME, NONE_NATIVE_TYPE_NAME, SET_NATIVE_TYPE_NAME, TEXT_NATIVE_TYPE_NAME } from "./NativeConstants";

export class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};
    readonly structureDefinitionsByName: Record<string, StructureDefinition> = {};

    addFunction(
        kind: string,
        fun: FunctionDefinition
    ) {

        if(!(kind in this.functionsByType))
            this.functionsByType[kind] = {};

        fun.aliases.forEach(a => {
            const name = a.getName();
            if(name !== undefined)
                this.functionsByType[kind][name] = fun
        });

    }

    addConversion(kind: string, conversion: ConversionDefinition) {

        if(!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        this.conversionsByType[kind].push(conversion);
    }

    addStructure(kind: string, structure: StructureDefinition) {

        // Cache the parents of the nodes, "crystalizing" it.
        // This means there should be no future changes to the native structure definition.
        structure.cacheParents();
        this.structureDefinitionsByName[kind] = structure;

        if(structure.block instanceof Block) {
            for(const statement of structure.block.statements) {
                if(statement instanceof FunctionDefinition)
                    this.addFunction(kind, statement);
                else if(statement instanceof ConversionDefinition)
                    this.addConversion(kind, statement);
            }
        }

    }
    
    getConversion(kind: string, context: Context, input: Type, output: Type): ConversionDefinition | undefined {
        if(!(kind in this.conversionsByType)) return undefined;
        return this.conversionsByType[kind].find(c => 
            c.convertsTypeTo(input, output, context));
    }

    getAllConversions() {
        // Copy it so that callers can't modify it.
        return Object.values(this.conversionsByType).reduce((all: ConversionDefinition[], next: ConversionDefinition[]) => [ ...all, ...next ], []);
    }
    
    getFunction(kind: string, name: string): FunctionDefinition | undefined {
        if(!(kind in this.functionsByType)) return undefined;
        return this.functionsByType[kind][name];
    }

    getStructureDefinition(kind: string): StructureDefinition | undefined {
        return this.structureDefinitionsByName[kind];
    }

}

export function createNativeFunction(
    docs: Documentation[], 
    aliases: Alias[], 
    typeVars: TypeVariable[], 
    inputs: Bind[], 
    output: Type,
    evaluator: (evaluator: Evaluation) => Value) {

    return new FunctionDefinition(
        docs, aliases, typeVars, inputs,
        new NativeExpression(
            output, 
            evaluator, 
            {
                "eng": docs.find(doc => doc.lang?.getLanguage() === "eng")?.docs.getText() ?? "No documentatinon"
            }
        ),
        output
    );

}

export function createNativeConversion(docs: Documentation[], inputTypeString: string, outputTypeString: string, fun: Function) {

    // Parse the expected type.
    const inputType = parseType(tokens(inputTypeString));
    if(inputType instanceof Unparsable)
        throw new Error(`Native conversion has unparsable output type: ${inputTypeString}`);
    
    return new ConversionDefinition(
        docs, inputType, outputTypeString,
        new NativeExpression(
            outputTypeString,
            evaluation => {
                const val = evaluation.getContext();
                if(val instanceof Value && inputType.accepts(val.getType(), evaluation.getEvaluator().getContext())) return fun.call(undefined, val);
                else return new TypeException(evaluation.getEvaluator(), inputType, val); 
            },
            {
                "eng": docs.find(doc => doc.lang?.getLanguage() === "eng")?.docs.getText() ?? "No documentation"
            }
        )
    )
}

const Native = new NativeBindings();

Native.addStructure(NONE_NATIVE_TYPE_NAME, bootstrapNone());
Native.addStructure(BOOLEAN_NATIVE_TYPE_NAME, bootstrapBool());
Native.addStructure(TEXT_NATIVE_TYPE_NAME, bootstrapText());
Native.addStructure(LIST_NATIVE_TYPE_NAME, bootstrapList());
Native.addStructure(MEASUREMENT_NATIVE_TYPE_NAME, bootstrapMeasurement());
Native.addStructure(SET_NATIVE_TYPE_NAME, bootstrapSet());
Native.addStructure(MAP_NATIVE_TYPE_NAME, bootstrapMap());

export default Native;