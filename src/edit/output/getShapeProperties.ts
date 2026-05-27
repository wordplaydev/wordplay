import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import ListLiteral from '@nodes/ListLiteral';
import { getOutputProperties } from '@edit/output/OutputProperties';
import OutputProperty from '@edit/output/OutputProperty';

export default function getShapeProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Shape.form.names,
            'form',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([]),
        ),
        ...getOutputProperties(project, locales),
    ];
}
