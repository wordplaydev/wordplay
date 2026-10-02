import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import type { LocaleTextsAccessor } from '#locale/Locales.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Unit from '#nodes/Unit.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyNumber from '#edit/output/OutputPropertyNumber.ts';

/**
 * A Velocity component: an always-editable compound-unit number field (m/s or °/s). The editable
 * predicate accepts only number literals (not ø), so an unset, ø-defaulting component shows
 * "computed" as the prior VelocityEditor did, while a set numeric value is edited in place.
 */
function component(name: LocaleTextsAccessor, unit: Unit): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyNumber(unit, 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0, unit),
        true,
    );
}

/** The editable inputs of a Velocity (x, y in m/s, angle in °/s). */
export default function getVelocityProperties(
    _project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        component((l) => l.output.Velocity.x.names, Unit.create(['m'], ['s'])),
        component((l) => l.output.Velocity.y.names, Unit.create(['m'], ['s'])),
        component(
            (l) => l.output.Velocity.angle.names,
            Unit.create(['°'], ['s']),
        ),
    ];
}
