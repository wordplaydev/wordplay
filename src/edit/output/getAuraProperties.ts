import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import { createColorLiteral } from '@output/Color';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';

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
