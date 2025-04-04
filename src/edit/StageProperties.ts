import type Project from '../db/projects/Project';
import type Locales from '../locale/Locales';
import ListLiteral from '../nodes/ListLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import { getTypeOutputProperties } from './OutputProperties';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';

export default function getStageProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Stage.content.names,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([]),
        ),
        new OutputProperty(
            (l) => l.output.Stage.gravity.names,
            new OutputPropertyRange(0, 20, 0.2, 'm/s^2', 1),
            true,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('9.8', Unit.create(['m'], ['s', 's'])),
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
