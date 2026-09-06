import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '@basis/Basis';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import type Expression from '@nodes/Expression';
import NumberType from '@nodes/NumberType';
import RangeType from '@nodes/RangeType';
import StructureDefinition from '@nodes/StructureDefinition';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import RangeValue from '@values/RangeValue';
import type Value from '@values/Value';

/**
 * The Range basis: `=`, `≠`, containment (`∋`), and the conversion to a list of the numbers
 * a range holds. Construction lives on Number instead, since `1‥10` is an operator on its
 * left bound — the same place `<` and `≥` live.
 */
export default function bootstrapRange(locales: Locales) {
    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Range.doc),
        getNameLocales(locales, (locale) => locale.basis.Range.name),
        // No interfaces
        [],
        // No type variables
        undefined,
        // No inputs
        [],
        new Block(
            [
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Range.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Range.function.notequals,
                    false,
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Range.function.has,
                    undefined,
                    // The number asked about must share the range's unit, which the deriver
                    // resolves from the range on the left — the same shape `<` uses.
                    [NumberType.make((unit) => unit)],
                    BooleanType.make(),
                    (requestor: Expression, evaluation: Evaluation) => {
                        const range: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        const number = evaluation.getInput(0);
                        // Neither should be possible, but the type system can't know it.
                        if (!(range instanceof RangeValue))
                            return evaluation.getValueOrTypeException(
                                evaluation.getDefinition(),
                                RangeType.make(),
                                range,
                            );
                        if (!(number instanceof NumberValue))
                            return evaluation.getValueOrTypeException(
                                evaluation.getDefinition(),
                                NumberType.make(),
                                number,
                            );
                        return new BoolValue(requestor, range.contains(number));
                    },
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Range.conversion.list,
                    ),
                    '‥',
                    '[#]',
                    (
                        requestor: Expression,
                        val: RangeValue,
                        evaluation: Evaluation,
                    ) => val.toList(requestor, evaluation.getEvaluator()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
