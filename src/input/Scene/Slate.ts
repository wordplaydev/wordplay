import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type { EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import Decimal from 'decimal.js';

export function createSlateType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Slate, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.input.Slate.scene)}•''
        ${getBind(locales, (locale) => locale.input.Slate.index)}•#
        ${getBind(locales, (locale) => locale.input.Slate.total)}•#
        ${getBind(locales, (locale) => locale.input.Slate.lap)}•#
        ${getBind(locales, (locale) => locale.input.Slate.waiting)}•?
    )
`);
}

/**
 * Where a scene is, as the scene itself knows it.
 *
 * `index` and `total` count only the scene's outputs, never the booleans
 * standing between them: a creator putting "3 of 10" on screen means the third
 * of ten things they can see, and counting raw list positions would say "5 of
 * 9" for the same show.
 */
export type SlateState = {
    /** The scene's own name, or '' when it has none. */
    scene: string;
    /** Which output is showing, counting from 1; 0 before anything shows. */
    index: number;
    /** How many outputs the scene has. */
    total: number;
    /** How many times the scene has come back around; 0 the first time through. */
    lap: number;
    /** Whether the scene is held at a false condition or by a pause. */
    waiting: boolean;
};

/**
 * What a Spotlight stream carries before any scene has reported. A Slate rather than
 * nothing, for the reason `SilentDownbeat` exists: a creator reading a stream
 * only to draw with should never have to guard it.
 *
 * `index` of 0 is the tell, since a showing scene counts from 1.
 */
export const EmptySlate: SlateState = {
    scene: '',
    index: 0,
    total: 0,
    lap: 0,
    waiting: false,
};

/** The value a Spotlight stream carries: where the scene it follows has got to. */
export function createSlateStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    state: SlateState,
): StructureValue {
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.input.Slate,
        new TextValue(creator, state.scene),
        new NumberValue(creator, new Decimal(state.index)),
        new NumberValue(creator, new Decimal(state.total)),
        new NumberValue(creator, new Decimal(state.lap)),
        new BoolValue(creator, state.waiting),
    );
}

/** True when two marks say the same thing, so an unchanged scene reports nothing. */
export function sameSlate(a: SlateState, b: SlateState): boolean {
    return (
        a.scene === b.scene &&
        a.index === b.index &&
        a.total === b.total &&
        a.lap === b.lap &&
        a.waiting === b.waiting
    );
}
