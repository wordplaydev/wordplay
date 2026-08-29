import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
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

/** A yes/no field property. */
function flag(name: LocaleTextsAccessor): OutputProperty {
    return new OutputProperty(
        name,
        'bool',
        false,
        false,
        (expr) => expr instanceof BooleanLiteral,
        () => BooleanLiteral.make(false),
    );
}

/** The editable inputs of a Shape's form. A Path's points are edited on stage rather than
 *  here, since a list of places isn't a field; everything else about one is. */
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
    if (form.is(project.shares.output.Path, context))
        return [
            flag((l) => l.output.Path.closed.names),
            flag((l) => l.output.Path.smooth.names),
            meters((l) => l.output.Path.thickness.names),
            meters((l) => l.output.Path.z.names),
        ];
    return [];
}
