import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyNumber from '@edit/output/OutputPropertyNumber';

/** A number-in-meters field property. */
function meters(name: LocaleTextsAccessor): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyNumber(Unit.reuse(['m']), 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0, Unit.reuse(['m'])),
    );
}

/** The editable inputs of a Shape's form (Rectangle, Circle, or Polygon), as number fields. */
export default function getFormProperties(
    project: Project,
    _locales: Locales,
    form: Evaluate,
): OutputProperty[] {
    const context = project.getNodeContext(form);
    if (form.is(project.shares.output.Rectangle, context))
        return [
            meters((l) => l.output.Rectangle.left.names),
            meters((l) => l.output.Rectangle.top.names),
            meters((l) => l.output.Rectangle.right.names),
            meters((l) => l.output.Rectangle.bottom.names),
            meters((l) => l.output.Rectangle.z.names),
        ];
    if (form.is(project.shares.output.Circle, context))
        return [
            meters((l) => l.output.Circle.radius.names),
            meters((l) => l.output.Circle.x.names),
            meters((l) => l.output.Circle.y.names),
            meters((l) => l.output.Circle.z.names),
        ];
    if (form.is(project.shares.output.Polygon, context))
        return [
            meters((l) => l.output.Polygon.radius.names),
            new OutputProperty(
                (l) => l.output.Polygon.sides.names,
                new OutputPropertyNumber(Unit.Empty, 0),
                false,
                false,
                (expr) => expr instanceof NumberLiteral,
                () => NumberLiteral.make(5),
            ),
            meters((l) => l.output.Polygon.x.names),
            meters((l) => l.output.Polygon.y.names),
            meters((l) => l.output.Polygon.z.names),
        ];
    return [];
}
