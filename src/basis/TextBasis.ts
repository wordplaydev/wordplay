import BooleanType from '@nodes/BooleanType';
import NumberType from '@nodes/NumberType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import BoolValue from '@values/BoolValue';
import type Value from '@values/Value';
import { createBasisConversion, createBasisFunction } from './Basis';
import TextValue from '@values/TextValue';
import StructureDefinition from '@nodes/StructureDefinition';
import NumberValue from '@values/NumberValue';
import ListValue from '@values/ListValue';
import Block, { BlockKind } from '@nodes/Block';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '@nodes/Expression';
import type Locale from '../locale/Locale';
import type { FunctionText } from '../locale/Locale';
import ListType from '../nodes/ListType';

export default function bootstrapText(locales: Locale[]) {
    function createBinaryTextFunction<OutputType extends Value>(
        functionText: (locale: Locale) => FunctionText<any>,
        fun: (
            requestor: Expression,
            text: TextValue,
            input: TextValue
        ) => OutputType,
        outputType: Type
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
                        input
                    );
                return fun(requestor, text, input);
            }
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
                        (evaluator.getClosure() as TextValue).length(requestor)
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
                                text
                            );
                        if (
                            count === undefined ||
                            !(count instanceof NumberValue)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                count
                            );
                        return text.repeat(
                            requestor,
                            Math.max(0, Math.floor(count.num.toNumber()))
                        );
                    }
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.equals,
                    (requestor, text, input) =>
                        new BoolValue(requestor, text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.notequals,
                    (requestor, text, input) =>
                        new BoolValue(requestor, !text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.segment,
                    (requestor, text, input) => text.segment(requestor, input),
                    ListType.make(TextType.make())
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.has,
                    (requestor, text, input) => text.has(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.starts,
                    (requestor, text, input) => text.starts(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<BoolValue>(
                    (locale) => locale.basis.Text.function.ends,
                    (requestor, text, input) => text.ends(requestor, input),
                    BooleanType.make()
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
                                other
                            );
                        return text.combine(requestor, other);
                    }
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.list
                    ),
                    '""',
                    '[""]',
                    (requestor: Expression, val: TextValue) =>
                        new ListValue(
                            requestor,
                            val.text
                                .split('')
                                .map((c) => new TextValue(requestor, c))
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.number
                    ),
                    '""',
                    '#',
                    (requestor: Expression, val: TextValue) =>
                        new NumberValue(requestor, val.text)
                ),
            ],
            BlockKind.Structure
        )
    );
}
