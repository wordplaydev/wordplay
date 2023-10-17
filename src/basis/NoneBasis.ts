import StructureDefinition from '@nodes/StructureDefinition';
import TextValue from '@values/TextValue';
import BoolValue from '@values/BoolValue';
import NoneValue from '@values/NoneValue';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import NoneType from '@nodes/NoneType';
import type Value from '@values/Value';
import { createBasisConversion, createBasisFunction } from './Basis';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import type { FunctionText, NameAndDoc } from '../locale/Locale';
import TextType from '../nodes/TextType';
import type Locales from '../locale/Locales';

export default function bootstrapNone(locales: Locales) {
    function createNoneFunction(
        locales: Locales,
        text: (locale: Locale) => FunctionText<NameAndDoc[]>,
        expression: (
            requestor: Expression,
            left: NoneValue,
            right: Value
        ) => Value
    ) {
        return createBasisFunction(
            locales,
            text,
            undefined,
            [NoneType.make()],
            BooleanType.make(),
            (requestor, evaluation) => {
                const left = evaluation.getClosure();
                const right = evaluation.getInput(0);
                // This should be impossible, but the type system doesn't know it.
                if (!(left instanceof NoneValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NoneType.None,
                        left
                    );

                if (right === undefined)
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NoneType.None,
                        right
                    );
                return expression(requestor, left, right);
            }
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.None.doc),
        getNameLocales(locales, (locale) => locale.basis.None.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.None.conversion.text
                    ),
                    NoneType.make(),
                    TextType.make(),
                    (requestor, val: NoneValue) =>
                        new TextValue(requestor, val.toString())
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.equals,
                    (requestor: Expression, left: NoneValue, right: Value) =>
                        new BoolValue(requestor, left.isEqualTo(right))
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.notequals,
                    (requestor: Expression, left: NoneValue, right: Value) =>
                        new BoolValue(requestor, !left.isEqualTo(right))
                ),
            ],
            BlockKind.Structure
        )
    );
}
