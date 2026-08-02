import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Unit from '@nodes/Unit';
import type { EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Decimal from 'decimal.js';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import { createPartStructure } from '@output/Music/Part';
import type { PartTick } from '@output/Music/schedule';

export function createDownbeatType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Downbeat, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.input.Downbeat.name)}•''
        ${getBind(locales, (locale) => locale.input.Downbeat.count)}•#
        ${getBind(locales, (locale) => locale.input.Downbeat.tempo)}•#beats/min
        ${getBind(locales, (locale) => locale.input.Downbeat.volume)}•%
        ${getBind(locales, (locale) => locale.input.Downbeat.key)}•#semitones
        ${getBind(locales, (locale) => locale.input.Downbeat.scale)}•[#semitones]
        ${getBind(locales, (locale) => locale.input.Downbeat.instruments)}•[🔈]
        ${getBind(locales, (locale) => locale.input.Downbeat.parts)}•[Part]
    )
`);
}

/** Everything the player knows at the moment a beat is heard. */
export type DownbeatState = {
    name: string;
    count: number;
    tempo: number;
    /** 0-1 gain, presented to the creator as a percentage. */
    volume: number;
    key: number;
    scale: readonly number[];
    instruments: readonly string[];
    parts: readonly PartTick[];
};

/** The value a Beat stream carries: which beat it is, and everything sounding. */
export function createDownbeatStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    state: DownbeatState,
): StructureValue {
    const InstrumentType = evaluator.project.shares.output.Instrument;
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Downbeat,
        new TextValue(creator, state.name),
        new NumberValue(creator, new Decimal(state.count)),
        new NumberValue(
            creator,
            new Decimal(state.tempo),
            Unit.reuse(['beats'], ['min']),
        ),
        new NumberValue(
            creator,
            new Decimal(state.volume * 100),
            Unit.reuse(['%']),
        ),
        new NumberValue(
            creator,
            new Decimal(state.key),
            Unit.reuse(['semitones']),
        ),
        new ListValue(
            creator,
            state.scale.map(
                (offset) =>
                    new NumberValue(
                        creator,
                        new Decimal(offset),
                        Unit.reuse(['semitones']),
                    ),
            ),
        ),
        new ListValue(
            creator,
            state.instruments.map((id) =>
                StructureValue.make(
                    evaluator,
                    creator,
                    InstrumentType,
                    new TextValue(creator, id),
                ),
            ),
        ),
        new ListValue(
            creator,
            state.parts.map((part) =>
                createPartStructure(evaluator, creator, part),
            ),
        ),
    );
}
