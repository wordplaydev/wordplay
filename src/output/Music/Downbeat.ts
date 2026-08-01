import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type { EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Decimal from 'decimal.js';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';

export function createDownbeatType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Downbeat, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.input.Downbeat.count)}•#
        ${getBind(locales, (locale) => locale.input.Downbeat.instruments)}•[🔈]
    )
`);
}

/** The value a Beat stream carries: which beat it is, and who is playing. */
export function createDownbeatStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    count: number,
    instruments: readonly string[],
): StructureValue {
    const InstrumentType = evaluator.project.shares.output.Instrument;
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Downbeat,
        new NumberValue(creator, new Decimal(count)),
        new ListValue(
            creator,
            instruments.map((id) =>
                StructureValue.make(
                    evaluator,
                    creator,
                    InstrumentType,
                    new TextValue(creator, id),
                ),
            ),
        ),
    );
}
