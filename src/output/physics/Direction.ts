import { getBind } from '#locale/getBind.ts';
import type { EvaluationNode } from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import NumberValue from '#values/NumberValue.ts';
import type Value from '#values/Value.ts';
import toStructure from '#basis/toStructure.ts';
import type Locales from '#locale/Locales.ts';
import Unit from '#nodes/Unit.ts';
import StructureValue from '#values/StructureValue.ts';
import Valued from '#output/Output/Valued.ts';

export function createDirectionType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Direction, '•')}(
        ${getBind(locales, (locale) => locale.input.Direction.x)}•#m
        ${getBind(locales, (locale) => locale.input.Direction.y)}•#m
    )
`);
}

export default class Direction extends Valued {
    readonly x: number;
    readonly y: number;

    constructor(value: Value, x: number, y: number) {
        super(value);

        this.x = x;
        this.y = y;
    }
}

export function createDirectionStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    x: number,
    y: number,
): StructureValue {
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Direction,
        new NumberValue(creator, x, Unit.reuse(['m'])),
        new NumberValue(creator, y, Unit.reuse(['m'])),
    );
}
