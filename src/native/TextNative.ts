import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import MeasurementType from '../nodes/MeasurementType';
import TextType from '../nodes/TextType';
import type Type from '../nodes/Type';
import Bool from '../runtime/Bool';
import type Evaluation from '../runtime/Evaluation';
import TypeException from '../runtime/TypeException';
import type Value from '../runtime/Value';
import { createNativeConversion, createNativeFunction } from './NativeBindings';
import Text from '../runtime/Text';
import StructureDefinition from '../nodes/StructureDefinition';
import Measurement from '../runtime/Measurement';
import List from '../runtime/List';
import Block from '../nodes/Block';
import type Translations from '../nodes/Translations';
import { TRANSLATE, WRITE, WRITE_DOCS } from '../nodes/Translations';
import type Node from '../nodes/Node';

export default function bootstrapText() {
    function createTextFunction(
        docs: Translations,
        names: Translations,
        inputs: Bind[],
        output: Type,
        expression: (
            requestor: Node,
            text: Text,
            evaluation: Evaluation
        ) => Value
    ) {
        return createNativeFunction(
            docs,
            names,
            undefined,
            inputs,
            output,
            (requestor, evaluation) => {
                const text = evaluation.getClosure();
                if (text instanceof Text)
                    return expression(requestor, text, evaluation);
                else
                    return new TypeException(
                        evaluation.getEvaluator(),
                        TextType.make(),
                        text
                    );
            }
        );
    }

    return StructureDefinition.make(
        undefined,
        {
            eng: 'text',
            '😀': "''",
        },
        [],
        undefined,
        [],
        new Block(
            [
                createTextFunction(
                    {
                        eng: WRITE,
                        '😀': WRITE,
                    },
                    {
                        eng: 'length',
                        '😀': TRANSLATE,
                    },
                    [],
                    MeasurementType.make(),
                    (requestor, text) => text.length(requestor)
                ),
                createTextFunction(
                    {
                        eng: WRITE,
                        '😀': WRITE,
                    },
                    {
                        eng: WRITE,
                        '😀': '=',
                    },
                    [
                        Bind.make(
                            {
                                eng: WRITE,
                                '😀': WRITE,
                            },
                            {
                                eng: 'val',
                                '😀': `${TRANSLATE}1`,
                            },
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const val = evaluation.resolve('val');
                        if (val instanceof Text)
                            return new Bool(requestor, text.isEqualTo(val));
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                TextType.make(),
                                val
                            );
                    }
                ),
                createTextFunction(
                    {
                        eng: WRITE,
                        '😀': WRITE,
                    },
                    {
                        eng: 'not-equal',
                        '😀': '≠',
                    },
                    [
                        Bind.make(
                            {
                                eng: WRITE,
                                '😀': WRITE,
                            },
                            {
                                eng: 'val',
                                '😀': `${TRANSLATE}1`,
                            },
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const val = evaluation.resolve('val');
                        if (val instanceof Text)
                            return new Bool(requestor, !text.isEqualTo(val));
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                TextType.make(),
                                val
                            );
                    }
                ),
                createNativeConversion(
                    WRITE_DOCS,
                    '""',
                    '[""]',
                    (requestor: Node, val: Text) =>
                        new List(
                            requestor,
                            val.text
                                .split('')
                                .map((c) => new Text(requestor, c))
                        )
                ),
                createNativeConversion(
                    WRITE_DOCS,
                    '""',
                    '#',
                    (requestor: Node, val: Text) =>
                        new Measurement(requestor, val.text)
                ),
            ],
            false,
            true
        )
    );
}
