import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import BoolValue from '#values/BoolValue.ts';
import type Locales from '#locale/Locales.ts';
import AnyType from '#nodes/AnyType.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Expression from '#nodes/Expression.ts';
import TextType from '#nodes/TextType.ts';
import StructureValue from '#values/StructureValue.ts';
import TextValue from '#values/TextValue.ts';
import Value from '#values/Value.ts';
import { createBasisConversion, createBasisFunction } from '#basis/Basis.ts';
import requestedTextLanguage from '#basis/requestedTextLanguage.ts';

export default function bootstrapStructure(locales: Locales) {
    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Structure.doc),
        getNameLocales(locales, (locale) => locale.basis.Structure.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBasisFunction(
                    locales,
                    (l) => l.basis.Structure.function.equals,
                    undefined,
                    [new AnyType()],
                    BooleanType.make(),
                    (requestor: Expression, evaluation: Evaluation) => {
                        const structure = evaluation.getClosure();
                        const other = evaluation.getInput(0);
                        if (!(
                            structure instanceof Value && other instanceof Value
                        ))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                new AnyType(),
                                other,
                            );
                        else
                            return new BoolValue(
                                requestor,
                                structure.isEqualTo(other),
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (l) => l.basis.Structure.function.notequal,
                    undefined,
                    [new AnyType()],
                    BooleanType.make(),
                    (requestor: Expression, evaluation: Evaluation) => {
                        const structure = evaluation.getClosure();
                        const other = evaluation.getInput(0);
                        if (!(
                            structure instanceof Value && other instanceof Value
                        ))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                new AnyType(),
                                other,
                            );
                        else
                            return new BoolValue(
                                requestor,
                                !structure.isEqualTo(other),
                            );
                    },
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (l) => l.basis.Structure.conversion.text,
                    ),
                    new AnyType(),
                    TextType.make(),
                    // Any value, not only structures: every type without a text conversion of its
                    // own resolves `→ ''` to this one, so a range, function, pattern, or a value of
                    // a union type passed analysis and then failed at runtime. Rendered the way a
                    // text template interpolates it.
                    Value,
                    (
                        requestor: Expression,
                        value: Value,
                        evaluation: Evaluation,
                    ) => {
                        const requested = requestedTextLanguage(evaluation);
                        return new TextValue(
                            requestor,
                            value instanceof StructureValue
                                ? value.toWordplay(locales)
                                : value instanceof TextValue
                                  ? value.text
                                  : value.toText(
                                        requested?.getLocaleID() ??
                                            locales.getLocale(),
                                    ),
                            requested,
                        );
                    },
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
