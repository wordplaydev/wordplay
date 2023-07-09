import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import Bool from '@runtime/Bool';
import Text from '@runtime/Text';
import { createNativeConversion } from './Native';
import NativeExpression from './NativeExpression';
import type Value from '@runtime/Value';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getInputLocales as getInputLocales } from '@locale/getInputLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Evaluation from '@runtime/Evaluation';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapBool(locales: Locale[]) {
    function createBooleanFunction(
        docs: Docs,
        names: Names,
        inputs: { docs: Docs; names: Names }[],
        expression: (requestor: Expression, left: Bool, right: Bool) => Bool
    ) {
        return FunctionDefinition.make(
            docs,
            names,
            undefined,
            inputs.map(({ docs, names }) =>
                Bind.make(docs, names, BooleanType.make())
            ),
            new NativeExpression(
                BooleanType.make(),
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    const right: Value | undefined = evaluation.resolve(
                        inputs[0].names
                    );
                    // This should be impossible, but the type system doesn't know it.
                    if (!(left instanceof Bool))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            BooleanType.make(),
                            left instanceof Evaluation ? undefined : left
                        );
                    if (!(right instanceof Bool))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            BooleanType.make(),
                            right
                        );
                    return expression(requestor, left, right);
                }
            ),
            BooleanType.make()
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (t) => t.native.bool.doc),
        getNameLocales(locales, (t) => t.native.bool.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBooleanFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.function.and.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.bool.function.and.name
                    ),
                    getInputLocales(
                        locales,
                        (t) => t.native.bool.function.and.inputs
                    ),
                    (requestor, left, right) => left.and(requestor, right)
                ),
                createBooleanFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.function.or.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.bool.function.or.name
                    ),
                    getInputLocales(
                        locales,
                        (t) => t.native.bool.function.or.inputs
                    ),
                    (requestor, left, right) => left.or(requestor, right)
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.function.not.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.bool.function.not.name
                    ),
                    undefined,
                    [],
                    new NativeExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const left = evaluation.getClosure();
                            // This should be impossible, but the type system doesn't know it.
                            if (!(left instanceof Bool))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    BooleanType.make(),
                                    left
                                );
                            return left.not(requestor);
                        }
                    ),
                    BooleanType.make()
                ),
                createBooleanFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.bool.function.equals.name
                    ),
                    getInputLocales(
                        locales,
                        (t) => t.native.bool.function.equals.inputs
                    ),
                    (requestor, left, right) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createBooleanFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.function.notequal.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.bool.function.notequal.name
                    ),
                    getInputLocales(
                        locales,
                        (t) => t.native.bool.function.notequal.inputs
                    ),
                    (requestor, left, right) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.bool.conversion.text
                    ),
                    '?',
                    "''",
                    (requestor, val: Value) =>
                        new Text(requestor, val.toString())
                ),
            ],
            BlockKind.Creator
        )
    );
}
