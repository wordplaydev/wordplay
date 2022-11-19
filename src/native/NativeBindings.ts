import type NativeInterface from "./NativeInterface";
import FunctionDefinition from "../nodes/FunctionDefinition";
import NativeExpression from "./NativeExpression";
import type Context from "../nodes/Context";
import type Type from "../nodes/Type";
import ConversionDefinition from "../nodes/ConversionDefinition";
import type TypeVariable from "../nodes/TypeVariable";
import type Bind from "../nodes/Bind";
import Value from "../runtime/Value";
import type Evaluation from "../runtime/Evaluation";
import type StructureDefinition from "../nodes/StructureDefinition";
import TypeException from "../runtime/TypeException";
import { parseType, tokens } from "../parser/Parser";
import bootstrapNone from "./NoneNative";
import bootstrapBool from "./BoolNative";
import bootstrapText from "./TextNative";
import bootstrapList from "./ListNative";
import bootstrapMeasurement from "./MeasurementNative";
import bootstrapSet from "./SetNative";
import bootstrapMap from "./MapNative";
import Block from "../nodes/Block";
import { BOOLEAN_NATIVE_TYPE_NAME, LIST_NATIVE_TYPE_NAME, MAP_NATIVE_TYPE_NAME, MEASUREMENT_NATIVE_TYPE_NAME, NONE_NATIVE_TYPE_NAME, SET_NATIVE_TYPE_NAME, TEXT_NATIVE_TYPE_NAME } from "./NativeConstants";
import { TRANSLATE } from "../nodes/Translations";
import type Translations from "../nodes/Translations";
import type Node from "../nodes/Node";
import Tree from "../nodes/Tree";

export class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};
    readonly structureDefinitionsByName: Record<string, StructureDefinition> = {};
    readonly structureDefinitionTrees: Tree[] = [];

    addFunction(
        kind: string,
        fun: FunctionDefinition
    ) {

        if(!(kind in this.functionsByType))
            this.functionsByType[kind] = {};

        fun.names.names.forEach(a => {
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
        this.structureDefinitionsByName[kind] = structure;

        if(structure.block instanceof Block) {
            for(const statement of structure.block.statements) {
                if(statement instanceof FunctionDefinition)
                    this.addFunction(kind, statement);
                else if(statement instanceof ConversionDefinition)
                    this.addConversion(kind, statement);
            }
        }

        this.structureDefinitionTrees.push(new Tree(structure));

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

    getAllStructureDefinitions() { return Object.values(this.structureDefinitionsByName); }

    getStructureDefinitionTrees() { return this.structureDefinitionTrees; }

}

export function createNativeFunction(
    docs: Translations, 
    aliases: Translations, 
    typeVars: TypeVariable[], 
    inputs: Bind[], 
    output: Type,
    evaluator: (requestor: Node, evaluator: Evaluation) => Value) {
    return new FunctionDefinition(
        docs, aliases, typeVars, inputs,
        new NativeExpression(
            output, 
            evaluator, 
            {
                "😀": TRANSLATE,
                eng: TRANSLATE
            }
        ),
        output
    );

}

export function createNativeConversion<ValueType extends Value>(docs: Translations, inputTypeString: string, outputTypeString: string, convert: (requestor: Node, value: ValueType) => Value) {

    // Parse the expected type.
    const inputType = parseType(tokens(inputTypeString));
    
    return new ConversionDefinition(
        docs, inputType, outputTypeString,
        new NativeExpression(
            outputTypeString,
            (requestor, evaluation) => {
                const val = evaluation.getContext();
                if(val instanceof Value && inputType.accepts(val.getType(evaluation.getEvaluator().getContext()), evaluation.getEvaluator().getContext())) 
                    return convert(requestor, val as ValueType);
                else 
                    return new TypeException(evaluation.getEvaluator(), inputType, val); 
            },
            docs
        )
    )
}

const Native = new NativeBindings();

export const NoneDefinition = bootstrapNone();
export const BoolDefinition = bootstrapBool();
export const TextDefinition = bootstrapText();
export const ListDefinition = bootstrapList();
export const MeasurementDefinition = bootstrapMeasurement();
export const SetDefinition = bootstrapSet();
export const MapDefinition = bootstrapMap()

Native.addStructure(NONE_NATIVE_TYPE_NAME, NoneDefinition);
Native.addStructure(BOOLEAN_NATIVE_TYPE_NAME, BoolDefinition);
Native.addStructure(TEXT_NATIVE_TYPE_NAME, TextDefinition);
Native.addStructure(LIST_NATIVE_TYPE_NAME, ListDefinition);
Native.addStructure(MEASUREMENT_NATIVE_TYPE_NAME, MeasurementDefinition);
Native.addStructure(SET_NATIVE_TYPE_NAME, SetDefinition);
Native.addStructure(MAP_NATIVE_TYPE_NAME, MapDefinition);

export default Native;