import { getBind } from '@locale/getBind';
import type { EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import toStructure from '../basis/toStructure';
import type Locales from '../locale/Locales';
import StructureValue from '../values/StructureValue';
import TextValue from '../values/TextValue';
import { createDirectionStructure } from './Direction';

export function createReboundType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Rebound, '•')}(
        ${getBind(locales, (locale) => locale.input.Rebound.subject)}•''
        ${getBind(locales, (locale) => locale.input.Rebound.object)}•''
        ${getBind(
            locales,
            (locale) => locale.input.Rebound.direction,
        )}•Direction
    )
`);
}

export function createReboundStructure(
    evaluator: Evaluator,
    creator: EvaluationNode,
    subject: string,
    object: string,
    direction: { x: number; y: number },
): StructureValue {
    return StructureValue.make(
        evaluator,
        creator,
        evaluator.project.shares.output.Rebound,
        new TextValue(creator, subject),
        new TextValue(creator, object),
        createDirectionStructure(evaluator, creator, direction.x, direction.y),
    );
}
