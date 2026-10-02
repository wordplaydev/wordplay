import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import BooleanType from '#nodes/BooleanType.ts';
import NoneType from '#nodes/NoneType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import BoolValue from '#values/BoolValue.ts';
import NoneValue from '#values/NoneValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { FunctionText, NameAndDoc } from '#locale/LocaleText.ts';
import type Expression from '#nodes/Expression.ts';
import TextType from '#nodes/TextType.ts';
import { createBasisConversion, createBasisFunction } from '#basis/Basis.ts';

export default function bootstrapNone(locales: Locales) {
    function createNoneFunction(
        locales: Locales,
        text: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        expression: (
            requestor: Expression,
            left: NoneValue,
            right: Value,
        ) => Value,
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
                        left,
                    );

                if (right === undefined)
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NoneType.None,
                        right,
                    );
                return expression(requestor, left, right);
            },
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
                        (locale) => locale.basis.None.conversion.text,
                    ),
                    NoneType.make(),
                    TextType.make(),
                    NoneValue,
                    (requestor, val: NoneValue) =>
                        new TextValue(requestor, val.toString()),
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.equals,
                    (requestor: Expression, left: NoneValue, right: Value) =>
                        new BoolValue(requestor, left.isEqualTo(right)),
                ),
                createNoneFunction(
                    locales,
                    (locale) => locale.basis.None.function.notequals,
                    (requestor: Expression, left: NoneValue, right: Value) =>
                        new BoolValue(requestor, !left.isEqualTo(right)),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
