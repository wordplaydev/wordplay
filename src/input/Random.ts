import NumberType from '@nodes/NumberType';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberValue from '@values/NumberValue';
import type Locale from '../locale/Locale';
import { createBasisFunction } from '../basis/Basis';
import type Evaluation from '../runtime/Evaluation';
import type Expression from '../nodes/Expression';

function getRandomInRange(
    random: number,
    min: number | undefined,
    max: number | undefined
) {
    return min === undefined
        ? max === undefined
            ? // No range provided, [0, 1)
              random
            : // Just a max, [0, max)
              random * max
        : max === undefined
        ? // Just a min, (-min, 0]
          random * min
        : // Both [min, max]
          getRandomIntInclusive(random, min, max);
}

function getRandomIntInclusive(random: number, min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(random * (max - min + 1) + min);
}

export function createRandomFunction(locales: Locale[]) {
    return createBasisFunction(
        locales,
        (locale) => locale.input.Random,
        undefined,
        [
            [
                UnionType.make(NumberType.make(), NoneType.make()),
                NoneLiteral.make(),
            ],
            [
                UnionType.make(NumberType.make(), NoneType.make()),
                NoneLiteral.make(),
            ],
        ],
        NumberType.make(),
        (requestor: Expression, evaluation: Evaluation) => {
            const min = evaluation.getInput(0);
            const max = evaluation.getInput(1);
            return new NumberValue(
                requestor,
                getRandomInRange(
                    evaluation.getEvaluator().getRandom(),
                    min instanceof NumberValue ? min.toNumber() : undefined,
                    max instanceof NumberValue ? max.toNumber() : undefined
                )
            );
        }
    );
}
