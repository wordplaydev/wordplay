import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import MeasurementType from '@nodes/MeasurementType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import { createNativeConversion, createNativeFunction } from './NativeBindings';
import Text from '@runtime/Text';
import StructureDefinition from '@nodes/StructureDefinition';
import Measurement from '@runtime/Measurement';
import List from '@runtime/List';
import Block from '@nodes/Block';
import type Node from '@nodes/Node';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getFunctionTranslations } from '@translation/getFunctionTranslations';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import type Expression from '@nodes/Expression';

export default function bootstrapText() {
    const equalsNames = getNameTranslations(
        (t) => t.native.text.function.equals.inputs[0].name
    );
    const notEqualsNames = getNameTranslations(
        (t) => t.native.text.function.notequals.inputs[0].name
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
        getDocTranslations((t) => t.native.text.doc),
        getNameTranslations((t) => t.native.text.name),
        [],
        undefined,
        [],
        new Block(
            [
                createTextFunction(
                    getFunctionTranslations(
                        (t) => t.native.text.function.length
                    ),
                    [],
                    MeasurementType.make(),
                    (requestor, text) => text.length(requestor)
                ),
                createTextFunction(
                    getFunctionTranslations(
                        (t) => t.native.text.function.equals
                    ),
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.text.function.equals.inputs[0].doc
                            ),
                            equalsNames,
                            TextType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, text, evaluation) => {
                        const val = evaluation.resolve(equalsNames);
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
                    getFunctionTranslations(
                        (t) => t.native.text.function.notequals
                    ),
                    [
                        Bind.make(
                            getDocTranslations(
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
                createNativeConversion(
                    getDocTranslations((t) => t.native.text.conversion.text),
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
                    getDocTranslations((t) => t.native.text.conversion.number),
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
