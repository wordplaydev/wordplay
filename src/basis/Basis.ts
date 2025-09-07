import { createInputs } from '@locale/createInputs';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import ConversionDefinition from '@nodes/ConversionDefinition';
import type Docs from '@nodes/Docs';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import Type from '@nodes/Type';
import type TypeVariables from '@nodes/TypeVariables';
import type Evaluation from '@runtime/Evaluation';
import createDefaultShares from '@runtime/createDefaultShares';
import Value from '@values/Value';
import type LanguageCode from '../locale/LanguageCode';
import type LocaleText from '../locale/LocaleText';
import { type FunctionText, type NameAndDoc } from '../locale/LocaleText';
import type Locales from '../locale/Locales';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import AnyType from '../nodes/AnyType';
import BooleanType from '../nodes/BooleanType';
import Root from '../nodes/Root';
import parseType from '../parser/parseType';
import { toTokens } from '../parser/toTokens';
import BoolValue from '../values/BoolValue';
import ValueException from '../values/ValueException';
import type { BasisTypeName } from './BasisConstants';
import bootstrapBool from './BoolBasis';
import InternalExpression from './InternalExpression';
import bootstrapList from './ListBasis';
import bootstrapMap from './MapBasis';
import bootstrapNone from './NoneBasis';
import bootstrapNumber from './NumberBasis';
import bootstrapSet from './SetBasis';
import bootstrapStructure from './StructureBasis';
import bootstrapTable from './TableBasis';
import bootstrapText from './TextBasis';

export class Basis {
    readonly locales: Locales;
    readonly languages: LanguageCode[];
    readonly shares: ReturnType<typeof createDefaultShares>;

    readonly functionsByType: Record<
        string,
        Record<string, FunctionDefinition>
    > = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};
    readonly structureDefinitionsByName: Record<string, StructureDefinition> =
        {};

    private readonly roots: Root[] = [];

    /**
     * A global collection of Basis for every combination of language codes.
     * The key in this case is the join of a sequence of LanguageCode.
     */
    static readonly Bases: Map<string, Basis> = new Map();

    constructor(locales: Locales) {
        this.locales = locales;
        this.languages = locales.getLanguages();

        this.addStructure('none', bootstrapNone(locales));
        this.addStructure('boolean', bootstrapBool(locales));
        this.addStructure('text', bootstrapText(locales));
        this.addStructure('list', bootstrapList(locales));
        this.addStructure('measurement', bootstrapNumber(locales));
        this.addStructure('set', bootstrapSet(locales));
        this.addStructure('map', bootstrapMap(locales));
        this.addStructure('table', bootstrapTable(locales));
        this.addStructure('structure', bootstrapStructure(locales));

        this.shares = createDefaultShares(locales);

        this.roots = [
            ...this.shares.all,
            ...this.getAllStructureDefinitions(),
            ...this.getAllFunctionDefinitions(),
            ...this.getAllConversions(),
        ].map((s) => new Root(s));
    }

    static getLocalizedBasis(locales: Locales) {
        const languages = locales.getLanguages();
        const key = languages.join(',');
        const basis = Basis.Bases.get(key) ?? new Basis(locales);
        Basis.Bases.set(key, basis);
        return basis;
    }

    getRoots() {
        return this.roots;
    }

    addFunction(kind: BasisTypeName, fun: FunctionDefinition) {
        if (!(kind in this.functionsByType)) this.functionsByType[kind] = {};

        fun.names.names.forEach((a) => {
            const name = a.getName();
            if (name !== undefined) this.functionsByType[kind][name] = fun;
        });
    }

    getAllFunctionDefinitions() {
        return Object.values(this.functionsByType).reduce(
            (
                all: FunctionDefinition[],
                next: Record<string, FunctionDefinition>,
            ) => [...all, ...Object.values(next)],
            [],
        );
    }

    addConversion(kind: BasisTypeName, conversion: ConversionDefinition) {
        if (!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        this.conversionsByType[kind].push(conversion);
    }

    addStructure(kind: BasisTypeName, structure: StructureDefinition) {
        // Cache the parents of the nodes, "crystalizing" it.
        // This means there should be no future changes to the basis structure definition.
        this.structureDefinitionsByName[kind] = structure;

        if (structure.expression instanceof Block) {
            for (const statement of structure.expression.statements) {
                if (statement instanceof FunctionDefinition)
                    this.addFunction(kind, statement);
                else if (statement instanceof ConversionDefinition)
                    this.addConversion(kind, statement);
            }
        }
    }

    getConversion(
        kind: string,
        context: Context,
        input: Type,
        output: Type,
    ): ConversionDefinition | undefined {
        if (!(kind in this.conversionsByType)) return undefined;
        return this.conversionsByType[kind].find((c) =>
            c.convertsTypeTo(input, output, context),
        );
    }

    getAllConversions() {
        // Copy it so that callers can't modify it.
        return Object.values(this.conversionsByType).reduce(
            (all: ConversionDefinition[], next: ConversionDefinition[]) => [
                ...all,
                ...next,
            ],
            [],
        );
    }

    getFunction(
        kind: BasisTypeName,
        name: string,
    ): FunctionDefinition | undefined {
        if (!(kind in this.functionsByType)) return undefined;
        return this.functionsByType[kind][name];
    }

    getStructureDefinition(
        kind: BasisTypeName,
    ): StructureDefinition | undefined {
        return this.structureDefinitionsByName[kind];
    }

    getAllStructureDefinitions() {
        return Object.values(this.structureDefinitionsByName);
    }

    getSimpleDefinition(name: BasisTypeName) {
        return this.structureDefinitionsByName[name];
    }
}

export function createBasisFunction(
    locales: Locales,
    text: (locale: LocaleText) => FunctionText<readonly NameAndDoc[]>,
    typeVars: TypeVariables | undefined,
    types: (Type | [Type, Expression])[],
    output: Type,
    evaluator: (requestor: Expression, evaluator: Evaluation) => Value,
) {
    return FunctionDefinition.make(
        getDocLocales(locales, (l) => text(l).doc),
        getNameLocales(locales, (l) => text(l).names),
        typeVars,
        createInputs(locales, (l) => text(l).inputs, types),
        new InternalExpression(output, [], evaluator),
        output,
    );
}

export function createEqualsFunction(
    locales: Locales,
    text: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
    equal: boolean,
) {
    return createBasisFunction(
        locales,
        text,
        undefined,
        [new AnyType()],
        BooleanType.make(),
        (requestor, evaluation) => {
            const left: Value | Evaluation | undefined =
                evaluation.getClosure();
            const right = evaluation.getInput(0);
            if (!(left instanceof Value))
                return new ValueException(evaluation.getEvaluator(), requestor);
            if (!(right instanceof Value))
                return new ValueException(evaluation.getEvaluator(), requestor);
            return new BoolValue(requestor, left.isEqualTo(right) === equal);
        },
    );
}

export function createBasisConversion<ValueType extends Value>(
    docs: Docs,
    input: Type | string,
    output: Type | string,
    convert: (requestor: Expression, value: ValueType) => Value,
) {
    // Parse the expected type.
    const inputType =
        input instanceof Type ? input : parseType(toTokens(input));
    const outputType =
        output instanceof Type ? output : parseType(toTokens(output));

    return ConversionDefinition.make(
        docs,
        inputType,
        output,
        new InternalExpression(outputType, [], (requestor, evaluation) => {
            const val = evaluation.getClosure();
            if (
                val instanceof Value &&
                inputType.accepts(
                    val.getType(evaluation.getContext()),
                    evaluation.getContext(),
                )
            )
                return convert(requestor, val as ValueType);
            else
                return evaluation.getValueOrTypeException(
                    requestor,
                    inputType,
                    val,
                );
        }),
    );
}
