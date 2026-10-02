import { getDocLocales } from '#locale/getDocLocales.ts';
import type Bind from '#nodes/Bind.ts';
import { must } from '#util/nullable.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import { textToFormatted } from '#basis/FormattedBasis.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Expression from '#nodes/Expression.ts';
import FormattedType from '#nodes/FormattedType.ts';
import NumberType from '#nodes/NumberType.ts';
import NoneType from '#nodes/NoneType.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import UnionType from '#nodes/UnionType.ts';
import NoneValue from '#values/NoneValue.ts';
import NameType from '#nodes/NameType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import { getResultTypeNames } from '#output/Result/Result.ts';
import Language from '#nodes/Language.ts';
import TextType from '#nodes/TextType.ts';
import type Type from '#nodes/Type.ts';
import BoolValue from '#values/BoolValue.ts';
import ListValue from '#values/ListValue.ts';
import MapValue from '#values/MapValue.ts';
import NumberValue from '#values/NumberValue.ts';
import { createStructure } from '#values/StructureValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type Names from '#nodes/Names.ts';
import PatternType from '#nodes/PatternType.ts';
import { getMatchLoop, matchStepBuilder } from '#runtime/pattern/matchSteps.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { FunctionText, NameAndDoc } from '#locale/LocaleText.ts';
import ListType from '#nodes/ListType.ts';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '#basis/Basis.ts';

const MAX_TEXT_LENGTH = 65536;

/** One of the shared `Result` structure's inputs. It is a basis definition
 *  with fixed inputs, so an index naming none is a defect in the basis. */
function resultInput(def: StructureDefinition, index: number): Bind {
    return must(def.inputs[index], `input ${index} of Result`);
}

export default function bootstrapText(locales: Locales) {
    function createBinaryTextFunction<OutputType extends Value>(
        functionText: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        fun: (
            requestor: Expression,
            text: TextValue,
            input: TextValue,
        ) => OutputType,
        outputType: Type,
    ) {
        return createBasisFunction(
            locales,
            functionText,
            undefined,
            [TextType.make()],
            outputType,
            (requestor, evaluation) => {
                const text = evaluation.getClosure();
                if (!(text instanceof TextValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        TextType.make(),
                        text,
                    );
                const input = evaluation.getInput(0);
                if (input === undefined || !(input instanceof TextValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        TextType.make(),
                        input,
                    );
                return fun(requestor, text, input);
            },
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Text.doc),
        getNameLocales(locales, (locale) => locale.basis.Text.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.length,
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluator) => {
                        const text = evaluator.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluator.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        return text.length(requestor);
                    },
                ),
                // Case conversion takes its locale from the receiver's own tag,
                // since only the tag says what language the letters are in; an
                // untagged text uses Unicode's root mapping, so the result
                // doesn't depend on the machine the program runs on.
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.uppercase,
                    undefined,
                    [],
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        return text.uppercase(requestor);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.lowercase,
                    undefined,
                    [],
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        return text.lowercase(requestor);
                    },
                ),
                // Position-based operations count in graphemes, matching
                // `length` and `→ ['']`, so an emoji is never cut in half.
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.subsequence,
                    undefined,
                    [
                        NumberType.make(),
                        [
                            UnionType.make(NumberType.make(), NoneType.make()),
                            NoneLiteral.make(),
                        ],
                    ],
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        const start = evaluation.getInput(0);
                        const end = evaluation.getInput(1);
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        if (!(start instanceof NumberValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                start,
                            );
                        if (!(
                            end instanceof NumberValue ||
                            end instanceof NoneValue
                        ))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                UnionType.make(
                                    NumberType.make(),
                                    NoneType.make(),
                                ),
                                end,
                            );
                        return text.subsequence(
                            requestor,
                            start.toNumber(),
                            end instanceof NumberValue
                                ? end.toNumber()
                                : undefined,
                        );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.index,
                    undefined,
                    [TextType.make()],
                    UnionType.make(NumberType.make(), NoneType.make()),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        const input = evaluation.getInput(0);
                        if (!(input instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                input,
                            );
                        const index = text.index(input);
                        return index === undefined
                            ? new NoneValue(requestor)
                            : new NumberValue(requestor, index);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.replace,
                    undefined,
                    [TextType.make(), TextType.make()],
                    // The replacement's words end up in the result, so its
                    // locale counts too, exactly as in combine.
                    TextType.make(undefined, (left, right) =>
                        Language.union(left, right),
                    ),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        const of = evaluation.getInput(0);
                        const replacement = evaluation.getInput(1);
                        if (!(of instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                of,
                            );
                        if (!(replacement instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                replacement,
                            );
                        return text.replace(requestor, of, replacement);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.trim,
                    undefined,
                    [],
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        return text.trim(requestor);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.reverse,
                    undefined,
                    [],
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        return text.reverse(requestor);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.repeat,
                    undefined,
                    [NumberType.make()],
                    // Repeating keeps the source's locale, so say so.
                    TextType.make(undefined, (left) => left),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        const count = evaluation.getInput(0);
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        if (
                            count === undefined ||
                            !(count instanceof NumberValue)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                count,
                            );

                        const textLength = text.text.length;
                        const desiredCount = count.num.toNumber();
                        const actualCount =
                            textLength * desiredCount > MAX_TEXT_LENGTH
                                ? Math.floor(MAX_TEXT_LENGTH / textLength)
                                : count.num.toNumber();
                        return text.repeat(
                            requestor,
                            Math.max(0, Math.floor(actualCount)),
                        );
                    },
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Text.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Text.function.notequals,
                    false,
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.segment,
                    (requestor, text, input) => text.segment(requestor, input),
                    ListType.make(TextType.make()),
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.has,
                    (requestor, text, input) => text.has(requestor, input),
                    BooleanType.make(),
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.starts,
                    (requestor, text, input) => text.starts(requestor, input),
                    BooleanType.make(),
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.ends,
                    (requestor, text, input) => text.ends(requestor, input),
                    BooleanType.make(),
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.combine,
                    undefined,
                    [TextType.make()],
                    // The result's locale is the union of the operands' locales,
                    // mirroring how numeric operators derive their unit.
                    TextType.make(undefined, (left, right) =>
                        Language.union(left, right),
                    ),
                    (requestor, evaluation) => {
                        const text = evaluation.getClosure();
                        if (!(text instanceof TextValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text,
                            );
                        const other = evaluation.getInput(0);
                        if (
                            other === undefined ||
                            !(other instanceof TextValue)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                other,
                            );
                        return text.combine(requestor, other);
                    },
                ),
                // ≈ : whole-text test against a pattern (LANGUAGE.md). The match
                // runs stepwise via matchStepBuilder; this finishes by reading
                // the result the steps produced.
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.matches,
                    undefined,
                    [PatternType.make()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const state = getMatchLoop(evaluation.getEvaluator());
                        evaluation.unscope();
                        return new BoolValue(
                            requestor,
                            typeof state?.result === 'boolean'
                                ? state.result
                                : false,
                        );
                    },
                    matchStepBuilder(false),
                ),
                // ⌕ : stepwise search, returning a list of Result structures.
                // The return type names `Result` (resolved against scope to the
                // shared structure, like Color.ts), rather than binding the def
                // here — `Result` is registered after the Text basis bootstraps.
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.search,
                    undefined,
                    [PatternType.make()],
                    ListType.make(
                        NameType.make(
                            must(
                                getResultTypeNames(locales).getNames()[0],
                                'a name for Result',
                            ),
                        ),
                    ),
                    (requestor, evaluation) => {
                        const evaluator = evaluation.getEvaluator();
                        const state = getMatchLoop(evaluator);
                        evaluation.unscope();
                        const matches = Array.isArray(state?.result)
                            ? state.result
                            : [];
                        const ResultType =
                            evaluator.project.shares.output.Result;
                        const results = matches.map((m) => {
                            const bindings = new Map<Names, Value>();
                            bindings.set(
                                resultInput(ResultType, 0).names,
                                new TextValue(requestor, m.text),
                            );
                            bindings.set(
                                resultInput(ResultType, 1).names,
                                new NumberValue(requestor, m.start + 1),
                            );
                            bindings.set(
                                resultInput(ResultType, 2).names,
                                new NumberValue(requestor, m.end),
                            );
                            const caps = [...m.caps];
                            bindings.set(
                                resultInput(ResultType, 3).names,
                                new MapValue(
                                    requestor,
                                    caps.map(([name, c]) => [
                                        new TextValue(requestor, name),
                                        new TextValue(requestor, c.text),
                                    ]),
                                ),
                            );
                            bindings.set(
                                resultInput(ResultType, 4).names,
                                new MapValue(
                                    requestor,
                                    caps.map(([name, c]) => [
                                        new TextValue(requestor, name),
                                        new NumberValue(requestor, c.start + 1),
                                    ]),
                                ),
                            );
                            bindings.set(
                                resultInput(ResultType, 5).names,
                                new MapValue(
                                    requestor,
                                    caps.map(([name, c]) => [
                                        new TextValue(requestor, name),
                                        new NumberValue(requestor, c.end),
                                    ]),
                                ),
                            );
                            return createStructure(
                                evaluator,
                                ResultType,
                                bindings,
                            );
                        });
                        return new ListValue(requestor, results);
                    },
                    matchStepBuilder(true),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.list,
                    ),
                    '""',
                    '[""]',
                    TextValue,
                    (requestor: Expression, val: TextValue) =>
                        val.segment(requestor, ''),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.number,
                    ),
                    '""',
                    '#',
                    TextValue,
                    (requestor: Expression, val: TextValue) =>
                        new NumberValue(requestor, val.text),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.formatted,
                    ),
                    TextType.make(),
                    FormattedType.make(),
                    TextValue,
                    (requestor: Expression, val: TextValue) =>
                        textToFormatted(requestor, val),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
