import NumberType from '@nodes/NumberType';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberValue from '@values/NumberValue';
import { createBasisFunction } from '../basis/Basis';
import type Evaluation from '../runtime/Evaluation';
import type Expression from '../nodes/Expression';
import NoneValue from '../values/NoneValue';
import TypeVariables from '../nodes/TypeVariables';
import TypeVariable from '../nodes/TypeVariable';
import type Locales from '../locale/Locales';

function getRandomInRange(
    random: number,
    min: NumberValue | undefined,
    max: NumberValue | undefined
) {
    // Swap if they're out of order.
    if (
        min !== undefined &&
        max !== undefined &&
        min.num.toNumber() > max.num.toNumber()
    ) {
        const temp = min;
        min = max;
        max = temp;
    }

    // Get the max precision, if available.
    const minPrecision = min?.precision;
    const maxPrecision = max?.precision;
    const precision =
        minPrecision === undefined
            ? maxPrecision === undefined
                ? undefined
                : maxPrecision
            : maxPrecision === undefined
            ? minPrecision
            : Math.max(minPrecision, maxPrecision);

    // Get the raw numbers
    const minNumber = min?.toNumber();
    const maxNumber = max?.toNumber();

    // Decide the range.
    if (minNumber === undefined) {
        if (maxNumber === undefined)
            return toPrecisionRange(0, 1, random, precision);
        else return toPrecisionRange(0, maxNumber, random, precision);
    } else {
        if (maxNumber === undefined)
            return toPrecisionRange(0, minNumber, random, precision);
        else return toPrecisionRange(minNumber, maxNumber, random, precision);
    }
}

function toPrecisionRange(
    min: number,
    max: number,
    random: number,
    precision: number | undefined
) {
    const scaled = random * (max - min) + min;
    const pow = precision !== undefined ? Math.pow(10, precision) : undefined;
    return pow ? Math.round(scaled * pow) / pow : scaled;
}

export function createRandomFunction(locales: Locales) {
    /** The type variable can be any number type, but nothing else */
    const NumberTypeVariable = TypeVariable.make(['Number'], NumberType.make());

    return createBasisFunction(
        locales,
        (locale) => locale.input.Random,
        TypeVariables.make([NumberTypeVariable]),
        [
            [
                UnionType.make(
                    NumberTypeVariable.getReference(),
                    NoneType.make()
                ),
                NoneLiteral.make(),
            ],
            [
                UnionType.make(
                    NumberTypeVariable.getReference(),
                    NoneType.make()
                ),
                NoneLiteral.make(),
            ],
        ],
        NumberTypeVariable.getReference(),
        (requestor: Expression, evaluation: Evaluation) => {
            const min = evaluation.getInput(0);
            const max = evaluation.getInput(1);
            if (!(min instanceof NumberValue || min instanceof NoneValue))
                return evaluation.getValueOrTypeException(
                    evaluation.getCreator(),
                    NumberType.make(),
                    min
                );
            if (!(max instanceof NumberValue || max instanceof NoneValue))
                return evaluation.getValueOrTypeException(
                    evaluation.getCreator(),
                    NumberType.make(),
                    max
                );
            return new NumberValue(
                requestor,
                getRandomInRange(
                    evaluation.getEvaluator().getRandom(),
                    min instanceof NoneValue ? undefined : min,
                    max instanceof NoneValue ? undefined : max
                ),
                min instanceof NumberValue
                    ? min.unit
                    : max instanceof NumberValue
                    ? max.unit
                    : undefined
            );
        }
    );
}
