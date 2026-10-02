import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import { getOutputProperties } from '#edit/output/OutputProperties.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';

export default function getShapeProperties(
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
        ...getOutputProperties(project, locales),
    ];
}
