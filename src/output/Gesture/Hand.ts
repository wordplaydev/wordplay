import { getTypeName } from '#locale/getNameLocales.ts';
import { getBind } from '#locale/getBind.ts';
import { FALSE_SYMBOL, TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Locales from '#locale/Locales.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import toStructure from '#basis/toStructure.ts';
import BoolValue from '#values/BoolValue.ts';
import NumberValue from '#values/NumberValue.ts';
import StructureValue from '#values/StructureValue.ts';

export function createHandType(locales: Locales) {
    const placeName = getTypeName(locales, (l) => l.output.Place.names);
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Gesture, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Gesture.place)}•${placeName}: ${placeName}()
        ${getBind(locales, (locale) => locale.output.Gesture.open)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.fingers)}•#: 0
        ${getBind(locales, (locale) => locale.output.Gesture.thumb)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.index)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.middle)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.ring)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.pinky)}•?: ${FALSE_SYMBOL}
        ${getBind(locales, (locale) => locale.output.Gesture.palm)}•?: ${FALSE_SYMBOL}
    )
`);
}

export type HandState = {
    place: StructureValue;
    open: boolean;
    fingers: number;
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
    palm: boolean;
};

export function createHandStructure(
    evaluator: Evaluator,
    state: HandState,
): StructureValue {
    const creator = evaluator.getMain();
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Gesture,
        state.place,
        new BoolValue(creator, state.open),
        new NumberValue(creator, state.fingers),
        new BoolValue(creator, state.thumb),
        new BoolValue(creator, state.index),
        new BoolValue(creator, state.middle),
        new BoolValue(creator, state.ring),
        new BoolValue(creator, state.pinky),
        new BoolValue(creator, state.palm),
    );
}
