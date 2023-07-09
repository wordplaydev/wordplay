import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import Text from '@runtime/Text';
import Bool from '@runtime/Bool';
import None from '@runtime/None';
import Block, { BlockKind } from '@nodes/Block';
import Bind from '@nodes/Bind';
import NativeExpression from './NativeExpression';
import BooleanType from '@nodes/BooleanType';
import NoneType from '@nodes/NoneType';
import type Value from '@runtime/Value';
import { createNativeConversion } from './Native';
import { NONE_SYMBOL } from '@parser/Symbols';
import type Names from '@nodes/Names';
import type Docs from '@nodes/Docs';
import { getFunctionLocales } from '@locale/getFunctionLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapNone(locales: Locale[]) {
    function createNativeNoneFunction(
        translations: {
            docs: Docs;
            names: Names;
            inputs: { docs: Docs; names: Names }[];
        },
        expression: (requestor: Expression, left: None, right: None) => Value
    ) {
        return FunctionDefinition.make(
            translations.docs,
            translations.names,
            undefined,
            [
                Bind.make(
                    translations.inputs[0].docs,
                    translations.inputs[0].names,
                    NoneType.make()
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
        getDocLocales(locales, (t) => t.native.None.doc),
        getNameLocales(locales, (t) => t.native.None.name),
        [],
        undefined,
        [],
        new Block(
            [
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.None.conversion.text
                    ),
                    NONE_SYMBOL,
                    "''",
                    (requestor, val: None) =>
                        new Text(requestor, val.toString())
                ),
                createNativeNoneFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.None.function.equals
                    ),
                    (requestor: Expression, left: None, right: None) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createNativeNoneFunction(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.None.function.notequals
                    ),
                    (requestor: Expression, left: None, right: None) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),
            ],
            BlockKind.Creator
        )
    );
}
