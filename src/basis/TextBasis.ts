import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import { textToFormatted } from '@basis/FormattedBasis';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import type Expression from '@nodes/Expression';
import FormattedType from '@nodes/FormattedType';
import NumberType from '@nodes/NumberType';
import NameType from '@nodes/NameType';
import StructureDefinition from '@nodes/StructureDefinition';
import { getResultTypeNames } from '@output/Result';
import Language from '@nodes/Language';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import NumberValue from '@values/NumberValue';
import { createStructure } from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Names from '@nodes/Names';
import PatternType from '@nodes/PatternType';
import type { PatternMatch } from '@runtime/pattern/match';
import {
    getMatchLoop,
    matchStepBuilder,
} from '@runtime/pattern/matchSteps';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { FunctionText, NameAndDoc } from '@locale/LocaleText';
import ListType from '@nodes/ListType';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '@basis/Basis';

const MAX_TEXT_LENGTH = 65536;

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
                const text = evaluation.getClosure() as TextValue;
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
                    (requestor, evaluator) =>
                        (evaluator.getClosure() as TextValue).length(requestor),
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Text.function.repeat,
                    undefined,
                    [NumberType.make()],
                    TextType.make(),
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
                        const text = evaluation.getClosure() as TextValue;
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
                            (state?.result as boolean) ?? false,
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
                        NameType.make(getResultTypeNames(locales).getNames()[0]),
                    ),
                    (requestor, evaluation) => {
                        const evaluator = evaluation.getEvaluator();
                        const state = getMatchLoop(evaluator);
                        evaluation.unscope();
                        const matches = (state?.result as PatternMatch[]) ?? [];
                        const ResultType =
                            evaluator.project.shares.output.Result;
                        const results = matches.map((m) => {
                                const bindings = new Map<Names, Value>();
                                bindings.set(
                                    ResultType.inputs[0].names,
                                    new TextValue(requestor, m.text),
                                );
                                bindings.set(
                                    ResultType.inputs[1].names,
                                    new NumberValue(requestor, m.start + 1),
                                );
                                bindings.set(
                                    ResultType.inputs[2].names,
                                    new NumberValue(requestor, m.end),
                                );
                                const caps = [...m.caps];
                                bindings.set(
                                    ResultType.inputs[3].names,
                                    new MapValue(
                                        requestor,
                                        caps.map(([name, c]) => [
                                            new TextValue(requestor, name),
                                            new TextValue(requestor, c.text),
                                        ]),
                                    ),
                                );
                                bindings.set(
                                    ResultType.inputs[4].names,
                                    new MapValue(
                                        requestor,
                                        caps.map(([name, c]) => [
                                            new TextValue(requestor, name),
                                            new NumberValue(
                                                requestor,
                                                c.start + 1,
                                            ),
                                        ]),
                                    ),
                                );
                                bindings.set(
                                    ResultType.inputs[5].names,
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
                    (requestor: Expression, val: TextValue) =>
                        textToFormatted(requestor, val),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
