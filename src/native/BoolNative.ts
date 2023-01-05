import Bind from '../nodes/Bind';
import Block from '../nodes/Block';
import BooleanType from '../nodes/BooleanType';
import FunctionDefinition from '../nodes/FunctionDefinition';
import StructureDefinition from '../nodes/StructureDefinition';
import Bool from '../runtime/Bool';
import Text from '../runtime/Text';
import TypeException from '../runtime/TypeException';
import { createNativeConversion } from './NativeBindings';
import NativeExpression from './NativeExpression';
import type Node from '../nodes/Node';
import type Value from '../runtime/Value';
import type Docs from '../nodes/Docs';
import type Names from '../nodes/Names';
import { getInputTranslations } from '../translations/getInputTranslations';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';

export default function bootstrapBool() {
    function createBooleanFunction(
        docs: Docs,
        names: Names,
        inputs: { docs: Docs; names: Names }[],
        expression: (requestor: Node, left: Bool, right: Bool) => Bool
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
                        return new TypeException(
                            evaluation.getEvaluator(),
                            BooleanType.make(),
                            left
                        );
                    if (!(right instanceof Bool))
                        return new TypeException(
                            evaluation.getEvaluator(),
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
        getDocTranslations((t) => t.native.bool.doc),
        getNameTranslations((t) => t.native.bool.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBooleanFunction(
                    getDocTranslations((t) => t.native.bool.function.and.doc),
                    getNameTranslations((t) => t.native.bool.function.and.name),
                    getInputTranslations(
                        (t) => t.native.bool.function.and.inputs
                    ),
                    (requestor, left, right) => left.and(requestor, right)
                ),
                createBooleanFunction(
                    getDocTranslations((t) => t.native.bool.function.or.doc),
                    getNameTranslations((t) => t.native.bool.function.or.name),
                    getInputTranslations(
                        (t) => t.native.bool.function.or.inputs
                    ),
                    (requestor, left, right) => left.or(requestor, right)
                ),
                FunctionDefinition.make(
                    getDocTranslations((t) => t.native.bool.function.not.doc),
                    getNameTranslations((t) => t.native.bool.function.not.name),
                    undefined,
                    [],
                    new NativeExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const left = evaluation.getClosure();
                            // This should be impossible, but the type system doesn't know it.
                            if (!(left instanceof Bool))
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    BooleanType.make(),
                                    left
                                );
                            return left.not(requestor);
                        }
                    ),
                    BooleanType.make()
                ),
                createBooleanFunction(
                    getDocTranslations(
                        (t) => t.native.bool.function.equals.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.bool.function.equals.name
                    ),
                    getInputTranslations(
                        (t) => t.native.bool.function.equals.inputs
                    ),
                    (requestor, left, right) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createBooleanFunction(
                    getDocTranslations(
                        (t) => t.native.bool.function.notequal.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.bool.function.notequal.name
                    ),
                    getInputTranslations(
                        (t) => t.native.bool.function.notequal.inputs
                    ),
                    (requestor, left, right) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.bool.conversion.text),
                    '?',
                    "''",
                    (requestor, val: Value) =>
                        new Text(requestor, val.toString())
                ),
            ],
            false,
            true
        )
    );
}
