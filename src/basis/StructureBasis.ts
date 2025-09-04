import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import StructureDefinition from '@nodes/StructureDefinition';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import type Locales from '../locale/Locales';
import AnyType from '../nodes/AnyType';
import BooleanType from '../nodes/BooleanType';
import type Expression from '../nodes/Expression';
import TextType from '../nodes/TextType';
import type StructureValue from '../values/StructureValue';
import TextValue from '../values/TextValue';
import Value from '../values/Value';
import { createBasisConversion, createBasisFunction } from './Basis';

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
                        if (
                            !(
                                structure instanceof Value &&
                                other instanceof Value
                            )
                        )
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
                        if (
                            !(
                                structure instanceof Value &&
                                other instanceof Value
                            )
                        )
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
                    (requestor: Expression, value: StructureValue) =>
                        new TextValue(requestor, value.toWordplay(locales)),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
