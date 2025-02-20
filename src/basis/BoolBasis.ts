import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import StructureDefinition from '@nodes/StructureDefinition';
import Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Locales from '../locale/Locales';
import type LocaleText from '../locale/LocaleText';
import type { FunctionText, NameAndDoc } from '../locale/LocaleText';
import type Expression from '../nodes/Expression';
import type Type from '../nodes/Type';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from './Basis';

export default function bootstrapBool(locales: Locales) {
    function createBooleanFunction(
        text: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        inputs: Type[],
        expression: (
            requestor: Expression,
            left: BoolValue,
            right: BoolValue,
        ) => BoolValue,
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
                        left instanceof Evaluation ? undefined : left,
                    );
                if (!(right instanceof BoolValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        BooleanType.make(),
                        right,
                    );
                return expression(requestor, left, right);
            },
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
                    (requestor, left, right) => left.and(requestor, right),
                ),
                createBooleanFunction(
                    (locale) => locale.basis.Boolean.function.or,
                    [BooleanType.make()],
                    (requestor, left, right) => left.or(requestor, right),
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
                                left,
                            );
                        return left.not(requestor);
                    },
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Boolean.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Boolean.function.notequal,
                    false,
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Boolean.conversion.text,
                    ),
                    '?',
                    "''",
                    (requestor, val: Value) =>
                        new TextValue(requestor, val.toString()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
