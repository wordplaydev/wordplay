import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import type Expression from '@nodes/Expression';
import NumberType from '@nodes/NumberType';
import StructureDefinition from '@nodes/StructureDefinition';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import type BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Locales from '../locale/Locales';
import type LocaleText from '../locale/LocaleText';
import type { FunctionText, NameAndDoc } from '../locale/LocaleText';
import ListType from '../nodes/ListType';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from './Basis';

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
                    TextType.make(),
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
            ],
            BlockKind.Structure,
        ),
    );
}
