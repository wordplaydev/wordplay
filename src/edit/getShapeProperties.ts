import type Locales from '../locale/Locales';
import type Project from '../db/projects/Project';
import ListLiteral from '../nodes/ListLiteral';
import { getOutputProperties } from './OutputProperties';
import OutputProperty from './OutputProperty';

export default function getShapeProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Shape.form),
            'form',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([]),
        ),
        ...getOutputProperties(project, locales),
    ];
}
