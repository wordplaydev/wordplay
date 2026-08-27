import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { getOutputProperties } from '@edit/output/OutputProperties';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyText from '@edit/output/OutputPropertyText';
import Language from '@nodes/Language';
import TextLiteral from '@nodes/TextLiteral';

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
                    expr.is(project.shares.output.Polygon, context) ||
                    expr.is(project.shares.output.Path, context)),
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
        // Whether the form is painted at all, beside the colors that paint it. Both default
        // to true, so a shape with neither set renders exactly as it always has.
        new OutputProperty(
            (l) => l.output.Shape.filled.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        new OutputProperty(
            (l) => l.output.Shape.stroked.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(true),
        ),
        // What the form is drawn with, beside whether it's drawn at all. Offered on every
        // shape rather than only on a @Path, since it is a Shape input — which is what makes
        // words around a circle discoverable and not just letters along a line.
        //
        // Language-tagged like every other text property the palette edits: BindText writes
        // one on each edit regardless, and glyphs can be words ("around and around") as
        // readily as a single mark, so treating them as translatable text is the right
        // default. Tagging the initial value too keeps it from appearing on the first edit.
        new OutputProperty(
            (l) => l.output.Shape.glyphs.names,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            (locales) =>
                TextLiteral.make('', Language.make(locales.getLanguages()[0])),
        ),
        ...getOutputProperties(project, locales),
    ];
}
