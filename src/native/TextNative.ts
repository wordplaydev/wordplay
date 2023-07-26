import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import NumberType from '@nodes/NumberType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import { createNativeConversion, createNativeFunction } from './Native';
import Text from '@runtime/Text';
import StructureDefinition from '@nodes/StructureDefinition';
import Number from '@runtime/Number';
import List from '@runtime/List';
import Block, { BlockKind } from '@nodes/Block';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getFunctionLocales } from '@locale/getFunctionLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '@nodes/Expression';
import type Locale from '../locale/Locale';
import type { FunctionText } from '../locale/Locale';
import ListType from '../nodes/ListType';

export default function bootstrapText(locales: Locale[]) {
    const countNames = getNameLocales(
        locales,
        (t) => t.native.Text.function.repeat.inputs[0].names
    );

    const combineNames = getNameLocales(
        locales,
        (t) => t.native.Text.function.combine.inputs[0].names
    );

    function createTextFunction(
        translations: {
            docs: Docs;
            names: Names;
            inputs: { docs: Docs; names: Names }[];
        },
        inputs: Bind[],
        output: Type,
        expression: (
            requestor: Expression,
            text: Text,
            evaluation: Evaluation
        ) => Value
    ) {
        return createNativeFunction(
            translations.docs,
            translations.names,
            undefined,
            inputs,
            output,
            (requestor, evaluation) => {
                const text = evaluation.getClosure();
                if (text instanceof Text)
                    return expression(requestor, text, evaluation);
                else
                    return evaluation.getValueOrTypeException(
                        requestor,
                        TextType.make(),
                        text
                    );
            }
        );
    }

    function createBinaryTextFunction<OutputType extends Value>(
        functionText: (locale: Locale) => FunctionText<any>,
        fun: (requestor: Expression, text: Text, input: Text) => OutputType,
        outputType: Type
    ) {
        const names = getNameLocales(
            locales,
            (locale) => functionText(locale).inputs[0].names
        );

        return createTextFunction(
            getFunctionLocales(locales, functionText),
            [
                Bind.make(
                    getDocLocales(
                        locales,
                        (locale) => functionText(locale).inputs[0].doc
                    ),
                    names,
                    TextType.make()
                ),
            ],
            outputType,
            (requestor, text, evaluation) => {
                const input = evaluation.resolve(names);
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
        getDocLocales(locales, (t) => t.native.Text.doc),
        getNameLocales(locales, (t) => t.native.Text.name),
        [],
        undefined,
        [],
        new Block(
            [
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.Text.function.length
                    ),
                    [],
                    NumberType.make(),
                    (requestor, text) => text.length(requestor)
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.Text.function.repeat
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Text.function.repeat.inputs[0].doc
                            ),
                            countNames,
                            NumberType.make()
                        ),
                    ],
                    TextType.make(),
                    (requestor, text, evaluation) => {
                        const count = evaluation.resolve(countNames);
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
                    (t) => t.native.Text.function.equals,
                    (requestor, text, input) =>
                        new Bool(requestor, text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (t) => t.native.Text.function.notequals,
                    (requestor, text, input) =>
                        new Bool(requestor, !text.isEqualTo(input)),
                    BooleanType.make()
                ),
                createBinaryTextFunction(
                    (t) => t.native.Text.function.segment,
                    (requestor, text, input) => text.segment(requestor, input),
                    ListType.make(TextType.make())
                ),
                createBinaryTextFunction<Bool>(
                    (t) => t.native.Text.function.has,
                    (requestor, text, input) => text.has(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<Bool>(
                    (t) => t.native.Text.function.starts,
                    (requestor, text, input) => text.starts(requestor, input),
                    BooleanType.make()
                ),
                createBinaryTextFunction<Bool>(
                    (t) => t.native.Text.function.ends,
                    (requestor, text, input) => text.ends(requestor, input),
                    BooleanType.make()
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.Text.function.combine
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Text.function.combine.inputs[0].doc
                            ),
                            combineNames,
                            TextType.make()
                        ),
                    ],
                    TextType.make(),
                    (requestor, text, evaluation) => {
                        const other = evaluation.resolve(combineNames);
                        if (other === undefined || !(other instanceof Text))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                other
                            );
                        return text.combine(requestor, other);
                    }
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.Text.conversion.list
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
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.Text.conversion.number
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
