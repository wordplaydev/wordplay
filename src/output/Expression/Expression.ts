import { getBind } from '@locale/getBind';
import { FALSE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import type Locales from '@locale/Locales';
import type Evaluator from '@runtime/Evaluator';
import toStructure from '@basis/toStructure';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import Unit from '@nodes/Unit';

export function createExpressionType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Expression, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Expression.place)}•Place: Place()
        ${getBind(locales, (locale) => locale.output.Expression.leftEyeOpen)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.rightEyeOpen)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.eyesOpen)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.mouthOpen)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.mouthOpenAmount)}•#: 0
        ${getBind(locales, (locale) => locale.output.Expression.smiling)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.smileAmount)}•#: 0
        ${getBind(locales, (locale) => locale.output.Expression.frowning)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.frownAmount)}•#: 0
        ${getBind(locales, (locale) => locale.output.Expression.browsRaised)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Expression.browRaiseAmount)}•#: 0
        ${getBind(locales, (locale) => locale.output.Expression.turn)}•#°: 0°
        ${getBind(locales, (locale) => locale.output.Expression.tilt)}•#°: 0°
    )
`);
}

export type ExpressionState = {
    place: StructureValue;
    leftEyeOpen: boolean;
    rightEyeOpen: boolean;
    eyesOpen: boolean;
    mouthOpen: boolean;
    mouthOpenAmount: number;
    smiling: boolean;
    smileAmount: number;
    frowning: boolean;
    frownAmount: number;
    browsRaised: boolean;
    browRaiseAmount: number;
    /** Head yaw in degrees (− left / + right). */
    turn: number;
    /** Head pitch in degrees (− down / + up). */
    tilt: number;
};

export function createExpressionStructure(
    evaluator: Evaluator,
    state: ExpressionState,
): StructureValue {
    const creator = evaluator.getMain();
    const degrees = Unit.reuse(['°']);
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Expression,
        state.place,
        new BoolValue(creator, state.leftEyeOpen),
        new BoolValue(creator, state.rightEyeOpen),
        new BoolValue(creator, state.eyesOpen),
        new BoolValue(creator, state.mouthOpen),
        new NumberValue(creator, state.mouthOpenAmount),
        new BoolValue(creator, state.smiling),
        new NumberValue(creator, state.smileAmount),
        new BoolValue(creator, state.frowning),
        new NumberValue(creator, state.frownAmount),
        new BoolValue(creator, state.browsRaised),
        new NumberValue(creator, state.browRaiseAmount),
        new NumberValue(creator, state.turn, degrees),
        new NumberValue(creator, state.tilt, degrees),
    );
}
