import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyNumber from '@edit/output/OutputPropertyNumber';
import OutputPropertyOptions from '@edit/output/OutputPropertyOptions';

/** A number-in-meters field property. */
function meters(name: LocaleTextsAccessor, fallback = 0): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyNumber(Unit.reuse(['m']), 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(fallback, Unit.reuse(['m'])),
    );
}

/** A unitless number field property. */
function number(name: LocaleTextsAccessor, fallback = 1): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyNumber(Unit.Empty, 0),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(fallback),
    );
}

/** A start/center/end alignment dropdown property. */
function alignment(name: LocaleTextsAccessor): OutputProperty {
    return new OutputProperty(
        name,
        new OutputPropertyOptions(
            ['<', '|', '>'].map((v) => ({ value: v, label: v })),
            true,
            (text) => TextLiteral.make(text),
            (expr) =>
                (expr instanceof TextLiteral ? expr.getText() : null) ?? '|',
        ),
        false,
        false,
        (expr) => expr instanceof TextLiteral,
        () => TextLiteral.make('|'),
    );
}

/** The editable inputs of a Group's arrangement (Row, Stack, Grid, or Free). */
export default function getArrangementProperties(
    project: Project,
    _locales: Locales,
    arrangement: Evaluate,
): OutputProperty[] {
    const context = project.getNodeContext(arrangement);
    if (arrangement.is(project.shares.output.Row, context))
        return [
            alignment((l) => l.output.Row.alignment.names),
            meters((l) => l.output.Row.padding.names, 1),
        ];
    if (arrangement.is(project.shares.output.Stack, context))
        return [
            alignment((l) => l.output.Stack.alignment.names),
            meters((l) => l.output.Stack.padding.names, 1),
        ];
    if (arrangement.is(project.shares.output.Grid, context))
        return [
            number((l) => l.output.Grid.rows.names),
            number((l) => l.output.Grid.columns.names),
            meters((l) => l.output.Grid.padding.names, 1),
            meters((l) => l.output.Grid.cellWidth.names, 1),
            meters((l) => l.output.Grid.cellHeight.names, 1),
        ];
    return [];
}
