import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import StructureDefinition from '@nodes/StructureDefinition';
import BoolValue from '@values/BoolValue';
import TextValue from '@values/TextValue';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from './Basis';
import type Value from '@values/Value';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Evaluation from '@runtime/Evaluation';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import type { FunctionText, NameAndDoc } from '../locale/Locale';
import type Type from '../nodes/Type';
import type Locales from '../locale/Locales';

export default function bootstrapBool(locales: Locales) {
    function createBooleanFunction(
        text: (locale: Locale) => FunctionText<NameAndDoc[]>,
        inputs: Type[],
        expression: (
            requestor: Expression,
            left: BoolValue,
            right: BoolValue
        ) => BoolValue
    ) {
        return createBasisFunction(
            locales,
            text,
            undefined,
            inputs,
            BooleanType.make(),
            (requestor, evaluation) => {
                const left = evaluation.getClosure();
                const right: Value | undefined = evaluation.getInput(0);
                // This should be impossible, but the type system doesn't know it.
                if (!(left instanceof BoolValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        BooleanType.make(),
                        left instanceof Evaluation ? undefined : left
                    );
                if (!(right instanceof BoolValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        BooleanType.make(),
                        right
                    );
                return expression(requestor, left, right);
            }
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Boolean.doc),
        getNameLocales(locales, (locale) => locale.basis.Boolean.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBooleanFunction(
                    (locale) => locale.basis.Boolean.function.and,
                    [BooleanType.make()],
                    (requestor, left, right) => left.and(requestor, right)
                ),
                createBooleanFunction(
                    (locale) => locale.basis.Boolean.function.or,
                    [BooleanType.make()],
                    (requestor, left, right) => left.or(requestor, right)
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Boolean.function.not,
                    undefined,
                    [],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const left = evaluation.getClosure();
                        // This should be impossible, but the type system doesn't know it.
                        if (!(left instanceof BoolValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                BooleanType.make(),
                                left
                            );
                        return left.not(requestor);
                    }
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Boolean.function.equals,
                    true
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Boolean.function.notequal,
                    false
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Boolean.conversion.text
                    ),
                    '?',
                    "''",
                    (requestor, val: Value) =>
                        new TextValue(requestor, val.toString())
                ),
            ],
            BlockKind.Structure
        )
    );
}
