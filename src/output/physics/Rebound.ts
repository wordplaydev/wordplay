import { getTypeName } from '#locale/getNameLocales.ts';
import { getBind } from '#locale/getBind.ts';
import type { EvaluationNode } from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import toStructure from '#basis/toStructure.ts';
import type Locales from '#locale/Locales.ts';
import StructureValue from '#values/StructureValue.ts';
import TextValue from '#values/TextValue.ts';
import { createDirectionStructure } from '#output/physics/Direction.ts';

export function createReboundType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.input.Rebound, '•')}(
        ${getBind(locales, (locale) => locale.input.Rebound.subject)}•''
        ${getBind(locales, (locale) => locale.input.Rebound.object)}•''
        ${getBind(
            locales,
            (locale) => locale.input.Rebound.direction,
        )}•${getTypeName(locales, (l) => l.input.Direction.names)}
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
