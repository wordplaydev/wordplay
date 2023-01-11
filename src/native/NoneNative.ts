import FunctionDefinition from '../nodes/FunctionDefinition';
import StructureDefinition from '../nodes/StructureDefinition';
import Text from '../runtime/Text';
import Bool from '../runtime/Bool';
import None from '../runtime/None';
import Block from '../nodes/Block';
import Bind from '../nodes/Bind';
import NativeExpression from './NativeExpression';
import BooleanType from '../nodes/BooleanType';
import NoneType from '../nodes/NoneType';
import type Value from '../runtime/Value';
import { createNativeConversion } from './NativeBindings';
import type Node from '../nodes/Node';
import { NONE_SYMBOL } from '../parser/Symbols';
import type Names from '../nodes/Names';
import type Docs from '../nodes/Docs';
import { getFunctionTranslations } from '../translation/getFunctionTranslations';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';

export default function bootstrapNone() {
    function createNativeNoneFunction(
        translations: {
            docs: Docs;
            names: Names;
            inputs: { docs: Docs; names: Names }[];
        },
        expression: (requestor: Node, left: None, right: None) => Value
    ) {
        return FunctionDefinition.make(
            translations.docs,
            translations.names,
            undefined,
            [
                Bind.make(
                    translations.inputs[0].docs,
                    translations.inputs[0].names,
                    BooleanType.make()
                ),
            ],
            new NativeExpression(
                BooleanType.make(),
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    const right = evaluation.resolve(
                        translations.inputs[0].names
                    );
                    // This should be impossible, but the type system doesn't know it.
                    if (!(left instanceof None))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            NoneType.None,
                            left
                        );

                    if (!(right instanceof None))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            NoneType.None,
                            right
                        );
                    return expression(requestor, left, right);
                }
            ),
            BooleanType.make()
        );
    }

    return StructureDefinition.make(
        getDocTranslations((t) => t.native.none.doc),
        getNameTranslations((t) => t.native.none.name),
        [],
        undefined,
        [],
        new Block(
            [
                createNativeConversion(
                    getDocTranslations((t) => t.native.none.conversion.text),
                    NONE_SYMBOL,
                    "''",
                    (requestor, val: None) =>
                        new Text(requestor, val.toString())
                ),
                createNativeNoneFunction(
                    getFunctionTranslations(
                        (t) => t.native.none.function.equals
                    ),
                    (requestor: Node, left: None, right: None) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createNativeNoneFunction(
                    getFunctionTranslations(
                        (t) => t.native.none.function.notequals
                    ),
                    (requestor: Node, left: None, right: None) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),
            ],
            false,
            true
        )
    );
}
