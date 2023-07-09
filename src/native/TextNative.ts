import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import MeasurementType from '@nodes/MeasurementType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import { createNativeConversion, createNativeFunction } from './Native';
import Text from '@runtime/Text';
import StructureDefinition from '@nodes/StructureDefinition';
import Measurement from '@runtime/Measurement';
import List from '@runtime/List';
import Block, { BlockKind } from '@nodes/Block';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getFunctionLocales } from '@locale/getFunctionLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '@nodes/Expression';
import ListType from '../nodes/ListType';
import type Locale from '../locale/Locale';

export default function bootstrapText(locales: Locale[]) {
    const equalsNames = getNameLocales(
        locales,
        (t) => t.native.text.function.equals.inputs[0].names
    );
    const notEqualsNames = getNameLocales(
        locales,
        (t) => t.native.text.function.notequals.inputs[0].names
    );

    const countNames = getNameLocales(
        locales,
        (t) => t.native.text.function.repeat.inputs[0].names
    );

    const segmentDelimiterNames = getNameLocales(
        locales,
        (t) => t.native.text.function.segment.inputs[0].names
    );

    const combineNames = getNameLocales(
        locales,
        (t) => t.native.text.function.combine.inputs[0].names
    );

    const hasNames = getNameLocales(
        locales,
        (t) => t.native.text.function.has.inputs[0].names
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

    return StructureDefinition.make(
        getDocLocales(locales, (t) => t.native.text.doc),
        getNameLocales(locales, (t) => t.native.text.name),
        [],
        undefined,
        [],
        new Block(
            [
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.length
                    ),
                    [],
                    MeasurementType.make(),
                    (requestor, text) => text.length(requestor)
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.repeat
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.text.function.repeat.inputs[0].doc
                            ),
                            countNames,
                            MeasurementType.make()
                        ),
                    ],
                    TextType.make(),
                    (requestor, text, evaluation) => {
                        const count = evaluation.resolve(countNames);
                        if (
                            count === undefined ||
                            !(count instanceof Measurement)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MeasurementType.make(),
                                count
                            );
                        return text.repeat(requestor, count.num.toNumber());
                    }
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.equals
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.text.function.equals.inputs[0].doc
                            ),
                            equalsNames,
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const val: Value | undefined =
                            evaluation.resolve(equalsNames);
                        if (val instanceof Text)
                            return new Bool(requestor, text.isEqualTo(val));
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                val
                            );
                    }
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.notequals
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.text.function.notequals.inputs[0]
                                        .doc
                            ),
                            notEqualsNames,
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const val = evaluation.resolve(notEqualsNames);
                        if (val instanceof Text)
                            return new Bool(requestor, !text.isEqualTo(val));
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                val
                            );
                    }
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.segment
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.text.function.segment.inputs[0].doc
                            ),
                            segmentDelimiterNames,
                            TextType.make()
                        ),
                    ],
                    ListType.make(TextType.make()),
                    (requestor, text, evaluation) => {
                        const delimiter = evaluation.resolve(
                            segmentDelimiterNames
                        );
                        if (
                            delimiter === undefined ||
                            !(delimiter instanceof Text)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                delimiter
                            );
                        return text.segment(requestor, delimiter);
                    }
                ),
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.combine
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.text.function.combine.inputs[0].doc
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
                createTextFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.text.function.has
                    ),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.text.function.has.inputs[0].doc
                            ),
                            hasNames,
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const other = evaluation.resolve(hasNames);
                        if (other === undefined || !(other instanceof Text))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                TextType.make(),
                                other
                            );
                        return text.has(requestor, other);
                    }
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.text.conversion.text
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
                        (t) => t.native.text.conversion.number
                    ),
                    '""',
                    '#',
                    (requestor: Expression, val: Text) =>
                        new Measurement(requestor, val.text)
                ),
            ],
            BlockKind.Creator
        )
    );
}
