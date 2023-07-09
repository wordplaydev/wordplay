import FunctionDefinition from '@nodes/FunctionDefinition';
import NativeExpression from './NativeExpression';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import ConversionDefinition from '@nodes/ConversionDefinition';
import type Bind from '@nodes/Bind';
import Value from '@runtime/Value';
import type Evaluation from '@runtime/Evaluation';
import type StructureDefinition from '@nodes/StructureDefinition';
import { parseType, toTokens } from '@parser/Parser';
import bootstrapNone from './NoneNative';
import bootstrapBool from './BoolNative';
import bootstrapText from './TextNative';
import bootstrapList from './ListNative';
import bootstrapMeasurement from './MeasurementNative';
import bootstrapSet from './SetNative';
import bootstrapMap from './MapNative';
import Block from '@nodes/Block';
import type { NativeTypeName } from './NativeConstants';
import type TypeVariables from '@nodes/TypeVariables';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import type Expression from '@nodes/Expression';
import Root from '../nodes/Root';
import type Locale from '../locale/Locale';
import getDefaultLocale from '../locale/getDefaultLocale';
import createDefaultShares from '../runtime/createDefaultShares';

export class Native {
    readonly locales: Locale[];
    readonly shares: ReturnType<typeof createDefaultShares>;

    constructor(locales: Locale[]) {
        this.locales = locales;

        this.addStructure('none', bootstrapNone(locales));
        this.addStructure('boolean', bootstrapBool(locales));
        this.addStructure('text', bootstrapText(locales));
        this.addStructure('list', bootstrapList(locales));
        this.addStructure('measurement', bootstrapMeasurement(locales));
        this.addStructure('set', bootstrapSet(locales));
        this.addStructure('map', bootstrapMap(locales));

        this.shares = createDefaultShares(locales);
    }

    readonly functionsByType: Record<
        string,
        Record<string, FunctionDefinition>
    > = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};
    readonly structureDefinitionsByName: Record<string, StructureDefinition> =
        {};
    readonly roots: Root[] = [];

    addFunction(kind: NativeTypeName, fun: FunctionDefinition) {
        if (!(kind in this.functionsByType)) this.functionsByType[kind] = {};

        fun.names.names.forEach((a) => {
            const name = a.getName();
            if (name !== undefined) this.functionsByType[kind][name] = fun;
        });
    }

    addConversion(kind: NativeTypeName, conversion: ConversionDefinition) {
        if (!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        this.conversionsByType[kind].push(conversion);
    }

    addStructure(kind: NativeTypeName, structure: StructureDefinition) {
        // Cache the parents of the nodes, "crystalizing" it.
        // This means there should be no future changes to the native structure definition.
        this.structureDefinitionsByName[kind] = structure;

        if (structure.expression instanceof Block) {
            for (const statement of structure.expression.statements) {
                if (statement instanceof FunctionDefinition)
                    this.addFunction(kind, statement);
                else if (statement instanceof ConversionDefinition)
                    this.addConversion(kind, statement);
            }
        }

        this.roots.push(new Root(structure));
    }

    getConversion(
        kind: string,
        context: Context,
        input: Type,
        output: Type
    ): ConversionDefinition | undefined {
        if (!(kind in this.conversionsByType)) return undefined;
        return this.conversionsByType[kind].find((c) =>
            c.convertsTypeTo(input, output, context)
        );
    }

    getAllConversions() {
        // Copy it so that callers can't modify it.
        return Object.values(this.conversionsByType).reduce(
            (all: ConversionDefinition[], next: ConversionDefinition[]) => [
                ...all,
                ...next,
            ],
            []
        );
    }

    getFunction(
        kind: NativeTypeName,
        name: string
    ): FunctionDefinition | undefined {
        if (!(kind in this.functionsByType)) return undefined;
        return this.functionsByType[kind][name];
    }

    getStructureDefinition(
        kind: NativeTypeName
    ): StructureDefinition | undefined {
        return this.structureDefinitionsByName[kind];
    }

    getAllStructureDefinitions() {
        return Object.values(this.structureDefinitionsByName);
    }

    getPrimitiveDefinition(name: NativeTypeName) {
        return this.structureDefinitionsByName[name];
    }
}

export function createNativeFunction(
    docs: Docs,
    names: Names,
    typeVars: TypeVariables | undefined,
    inputs: Bind[],
    output: Type,
    evaluator: (requestor: Expression, evaluator: Evaluation) => Value
) {
    return FunctionDefinition.make(
        docs,
        names,
        typeVars,
        inputs,
        new NativeExpression(output, evaluator),
        output
    );
}

export function createNativeConversion<ValueType extends Value>(
    docs: Docs,
    inputTypeString: string,
    outputTypeString: string,
    convert: (requestor: Expression, value: ValueType) => Value
) {
    // Parse the expected type.
    const inputType = parseType(toTokens(inputTypeString));

    return ConversionDefinition.make(
        docs,
        inputType,
        outputTypeString,
        new NativeExpression(outputTypeString, (requestor, evaluation) => {
            const val = evaluation.getClosure();
            if (
                val instanceof Value &&
                inputType.accepts(
                    val.getType(evaluation.getContext()),
                    evaluation.getContext()
                )
            )
                return convert(requestor, val as ValueType);
            else
                return evaluation.getValueOrTypeException(
                    requestor,
                    inputType,
                    val
                );
        })
    );
}

export function bootstrap(locales: Locale[]) {
    const native = new Native(locales);

    return native;
}

/** Use for tests to get the default (English) locale. */
export async function getDefaultNative() {
    return bootstrap([await getDefaultLocale(true)]);
}
