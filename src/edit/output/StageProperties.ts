import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Unit from '#nodes/Unit.ts';
import { getTypeOutputProperties } from '#edit/output/OutputProperties.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';

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
        new OutputProperty(
            (l) => l.output.Stage.air.names,
            // A multiple of ordinary air: 0 is space, 1 is what every project
            // has always had.
            new OutputPropertyRange(0, 3, 0.1, '', 1),
            true,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1),
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
