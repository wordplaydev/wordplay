import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import NoneLiteral from '@nodes/NoneLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyNumber from '@edit/output/OutputPropertyNumber';

/**
 * A Place coordinate: an always-editable number field (inline), seeded with its default. The
 * editable predicate also accepts ø so an unset, ø-defaulting input (Place.rotation) still
 * renders a field at 0 rather than a read-only "default" note, matching the prior PlaceEditor.
 */
function coordinate(name: LocaleTextsAccessor, unit: Unit): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyNumber(unit, 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral || expr instanceof NoneLiteral,
        () => NumberLiteral.make(0, unit),
        true,
    );
}

/** The editable inputs of a Place (x, y, z in meters, rotation in degrees). */
export default function getPlaceProperties(
    _project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        coordinate((l) => l.output.Place.x.names, Unit.reuse(['m'])),
        coordinate((l) => l.output.Place.y.names, Unit.reuse(['m'])),
        coordinate((l) => l.output.Place.z.names, Unit.reuse(['m'])),
        coordinate((l) => l.output.Place.rotation.names, Unit.reuse(['°'])),
    ];
}
