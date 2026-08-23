import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';

/** The editable inputs of a Matter() value: sliders for the physical quantities and
 *  checkboxes for the collision toggles. */
export default function getMatterProperties(
    _project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Matter.mass.names,
            new OutputPropertyRange(0, 10, 0.1, 'kg', 1),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.reuse(['kg'])),
        ),
        new OutputProperty(
            (l) => l.output.Matter.bounciness.names,
            new OutputPropertyRange(0, 1, 0.01, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0),
        ),
        new OutputProperty(
            (l) => l.output.Matter.friction.names,
            new OutputPropertyRange(0, 1, 0.01, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0.8),
        ),
        new OutputProperty(
            (l) => l.output.Matter.roundedness.names,
            new OutputPropertyRange(0, 1, 0.01, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0.1),
        ),
        new OutputProperty(
            (l) => l.output.Matter.text.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.output.Matter.shapes.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.output.Matter.pull.names,
            // Negative pulls push away, so the range straddles zero. It
            // reaches this far because pull is multiplied by mass: at this
            // slider's top and the mass slider's 10kg it matches the 2000 the
            // Orbits example uses, and a default 1kg phrase at 200 pulls at
            // about half stage gravity a metre away.
            new OutputPropertyRange(-200, 200, 5, '', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0),
        ),
    ];
}
