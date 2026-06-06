import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { getOutputProperties } from '@edit/output/OutputProperties';
import OutputProperty from '@edit/output/OutputProperty';

export default function getShapeProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Shape.form.names,
            'structure',
            true,
            false,
            // A form is a single Rectangle/Circle/Polygon value.
            (expr, context) =>
                expr instanceof Evaluate &&
                (expr.is(project.shares.output.Rectangle, context) ||
                    expr.is(project.shares.output.Circle, context) ||
                    expr.is(project.shares.output.Polygon, context)),
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Rectangle.names),
                        project.shares.output.Rectangle,
                    ),
                    [
                        NumberLiteral.make(-1, Unit.reuse(['m'])),
                        NumberLiteral.make(1, Unit.reuse(['m'])),
                        NumberLiteral.make(1, Unit.reuse(['m'])),
                        NumberLiteral.make(-1, Unit.reuse(['m'])),
                    ],
                ),
        ),
        ...getOutputProperties(project, locales),
    ];
}
