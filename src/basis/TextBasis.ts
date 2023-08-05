import BooleanType from '@nodes/BooleanType';
import NumberType from '@nodes/NumberType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import type Value from '@runtime/Value';
import { createBasisConversion, createBasisFunction } from './Basis';
import Text from '@runtime/Text';
import StructureDefinition from '@nodes/StructureDefinition';
import Number from '@runtime/Number';
import List from '@runtime/List';
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
        fun: (requestor: Expression, text: Text, input: Text) => OutputType,
        outputType: Type
    ) {
        return createBasisFunction(
            locales,
            functionText,
            undefined,
            [TextType.make()],
            outputType,
            (requestor, evaluation) => {
                const text = evaluation.getClosure() as Text;
                const input = evaluation.getInput(0);
                if (input === undefined || !(input instanceof Text))
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
                        (evaluator.getClosure() as Text).length(requestor)
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
                        if (!(text instanceof Text))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                text
                            );
                        if (count === undefined || !(count instanceof Number))
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
                        new Bool(requestor, text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.notequals,
                    (requestor, text, input) =>
                        new Bool(requestor, !text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (locale) => locale.basis.Text.function.segment,
                    (requestor, text, input) => text.segment(requestor, input),
                    ListType.make(TextType.make())
                ),
                createBinaryTextFunction<Bool>(
                    (locale) => locale.basis.Text.function.has,
                    (requestor, text, input) => text.has(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<Bool>(
                    (locale) => locale.basis.Text.function.starts,
                    (requestor, text, input) => text.starts(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<Bool>(
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
                        const text = evaluation.getClosure() as Text;
                        const other = evaluation.getInput(0);
                        if (other === undefined || !(other instanceof Text))
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
                    (requestor: Expression, val: Text) =>
                        new List(
                            requestor,
                            val.text
                                .split('')
                                .map((c) => new Text(requestor, c))
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Text.conversion.number
                    ),
                    '""',
                    '#',
                    (requestor: Expression, val: Text) =>
                        new Number(requestor, val.text)
                ),
            ],
            BlockKind.Structure
        )
    );
}
