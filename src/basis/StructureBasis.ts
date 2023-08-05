import StructureDefinition from '@nodes/StructureDefinition';
import Block, { BlockKind } from '@nodes/Block';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locale from '../locale/Locale';
import { createBasisConversion, createBasisFunction } from './Basis';
import Bool from '../runtime/Bool';
import BooleanType from '../nodes/BooleanType';
import type Evaluation from '../runtime/Evaluation';
import type Expression from '../nodes/Expression';
import AnyType from '../nodes/AnyType';
import Value from '../runtime/Value';
import type Structure from '../runtime/Structure';
import TextType from '../nodes/TextType';
import Text from '../runtime/Text';

export default function bootstrapStructure(locales: Locale[]) {
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
                                other
                            );
                        else
                            return new Bool(
                                requestor,
                                structure.isEqualTo(other)
                            );
                    }
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
                                other
                            );
                        else
                            return new Bool(
                                requestor,
                                !structure.isEqualTo(other)
                            );
                    }
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (l) => l.basis.Structure.conversion.text
                    ),
                    new AnyType(),
                    TextType.make(),
                    (requestor: Expression, value: Structure) =>
                        new Text(requestor, value.toWordplay(locales))
                ),
            ],
            BlockKind.Structure
        )
    );
}
