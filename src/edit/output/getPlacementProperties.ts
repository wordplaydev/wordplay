import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyNumber from '@edit/output/OutputPropertyNumber';

/**
 * The editable inputs of a Placement() stream other than its `place` (which the editor edits
 * with a PlaceEditor directly): how far to move, and which axes to move along. The names come
 * from the Placement input list: [place, distance, horizontal, vertical, depth].
 */
export default function getPlacementProperties(
    _project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.input.Placement.inputs[1].names,
            new OutputPropertyNumber(Unit.reuse(['m']), 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.reuse(['m'])),
        ),
        new OutputProperty(
            (l) => l.input.Placement.inputs[2].names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.input.Placement.inputs[3].names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.input.Placement.inputs[4].names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false),
        ),
    ];
}
