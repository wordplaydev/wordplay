import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import Evaluate from '#nodes/Evaluate.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Unit from '#nodes/Unit.ts';
import { createColorLiteral } from '#output/Color/Color.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';

/**
 * The editable inputs of an Aura: a color (always editable, even when unset/ø) plus blur and
 * offset sliders. All are inline so they render seeded with defaults rather than as read-only
 * "default" notes, matching the prior AuraEditor's always-on controls.
 */
export default function getAuraProperties(
    project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Aura.color.names,
            'color',
            false,
            false,
            (expr, context) =>
                (expr instanceof Evaluate &&
                    expr.is(project.shares.output.Color, context)) ||
                expr instanceof NoneLiteral,
            (locales) => createColorLiteral(project, locales, 0, 0, 0),
            true,
        ),
        new OutputProperty(
            (l) => l.output.Aura.blur.names,
            new OutputPropertyRange(0, 0.5, 0.01, 'm', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0.1, Unit.reuse(['m'])),
            true,
        ),
        new OutputProperty(
            (l) => l.output.Aura.offsetX.names,
            new OutputPropertyRange(-0.5, 0.5, 0.01, 'm', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Unit.reuse(['m'])),
            true,
        ),
        new OutputProperty(
            (l) => l.output.Aura.offsetY.names,
            new OutputPropertyRange(-0.5, 0.5, 0.01, 'm', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Unit.reuse(['m'])),
            true,
        ),
    ];
}
