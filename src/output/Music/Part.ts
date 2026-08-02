/**
 * One track's state on one beat, as a value a creator can read from a
 * `Downbeat`. This is what makes music visualizable: a `Beat` hands over
 * everything the player knows about each track at the moment it is heard, so
 * creator-authored visuals can be as rich as the built-in ones.
 *
 * The values here are the *resolved* ones the player is actually using — a
 * track's scale and key after any override, and degrees already resolved to
 * semitones — because a visualization needs what is sounding, not what was
 * written before defaults were applied.
 */

import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Unit from '@nodes/Unit';
import type { EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Decimal from 'decimal.js';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type { PartTick } from '@output/Music/schedule';

export function createPartType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Part, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.input.Part.instrument)}•🔈
        ${getBind(locales, (locale) => locale.input.Part.sounding)}•?
        ${getBind(locales, (locale) => locale.input.Part.degrees)}•[#]
        ${getBind(locales, (locale) => locale.input.Part.pitch)}•[#semitones]
        ${getBind(locales, (locale) => locale.input.Part.volume)}•%
        ${getBind(locales, (locale) => locale.input.Part.pan)}•#
        ${getBind(locales, (locale) => locale.input.Part.scale)}•[#semitones]
        ${getBind(locales, (locale) => locale.input.Part.key)}•#semitones
        ${getBind(locales, (locale) => locale.input.Part.loop)}•?
    )
`);
}

/** Semitone-valued numbers, the unit `key`, `pitch`, and `scale` all carry. */
function semitones(creator: EvaluationNode, value: number): NumberValue {
    return new NumberValue(
        creator,
        new Decimal(value),
        Unit.reuse(['semitones']),
    );
}

export function createPartStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    part: PartTick,
): StructureValue {
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Part,
        StructureValue.make(
            evaluator,
            creator,
            evaluator.project.shares.output.Instrument,
            new TextValue(creator, part.instrument),
        ),
        new BoolValue(creator, part.sounding),
        new ListValue(
            creator,
            part.degrees.map(
                (degree) => new NumberValue(creator, new Decimal(degree)),
            ),
        ),
        new ListValue(
            creator,
            part.pitch.map((value) => semitones(creator, value)),
        ),
        // Volumes are percentages in the language and 0-1 in the player.
        new NumberValue(
            creator,
            new Decimal(part.volume * 100),
            Unit.reuse(['%']),
        ),
        new NumberValue(creator, new Decimal(part.pan)),
        new ListValue(
            creator,
            part.scale.map((offset) => semitones(creator, offset)),
        ),
        semitones(creator, part.key),
        new BoolValue(creator, part.loop),
    );
}
