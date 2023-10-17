import type Project from '../models/Project';
import ListLiteral from '../nodes/ListLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import { getTypeOutputProperties } from './OutputProperties';
import type Locales from '../locale/Locales';

export default function getStageProperties(
    project: Project,
    locales: Locales
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Stage.content),
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
        new OutputProperty(
            locales.get((l) => l.output.Stage.gravity),
            new OutputPropertyRange(0, 20, 0.2, 'm/s^2', 1),
            true,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('9.8', Unit.create(['m'], ['s', 's']))
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
