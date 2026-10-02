import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyOptions from '#edit/output/OutputPropertyOptions.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';
import OutputPropertyText from '#edit/output/OutputPropertyText.ts';
import Evaluate from '#nodes/Evaluate.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import Unit from '#nodes/Unit.ts';
import {
    BubbleSides,
    DefaultKind,
    DefaultWrap,
    SpeechKind,
    ThoughtKind,
} from '#output/Bubble/Bubble.ts';
import { createColorLiteral } from '#output/Color/Color.ts';

/**
 * The editable inputs of a speech bubble. All inline, so they render seeded with
 * defaults rather than as read-only "default" notes, matching Aura and Place.
 */
export default function getBubbleProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Bubble.text.names,
            new OutputPropertyText(() => true),
            true,
            false,
            // A Say is a legal value here — it's how a bubble speaks — but it
            // isn't text, so the field leaves it to the editor rather than
            // flattening it into a string.
            (expr) =>
                expr instanceof TextLiteral || expr instanceof FormattedLiteral,
            () => TextLiteral.make(''),
        ),
        new OutputProperty(
            (l) => l.output.Bubble.side.names,
            new OutputPropertyOptions(
                BubbleSides.map((side) => ({ value: side, label: side })),
                // Unset is a real choice here — it means "pick a side for me" —
                // so the select offers it, as the dash the widget renders for none.
                true,
                (text) => TextLiteral.make(text),
                (expr) =>
                    expr instanceof TextLiteral ? expr.getText() : undefined,
            ),
            false,
            false,
            (expr) =>
                expr instanceof TextLiteral || expr instanceof NoneLiteral,
            () => NoneLiteral.make(),
            true,
        ),
        new OutputProperty(
            (l) => l.output.Bubble.kind.names,
            new OutputPropertyOptions(
                [SpeechKind, ThoughtKind].map((kind) => ({
                    value: kind,
                    label: kind,
                })),
                false,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ??
                    DefaultKind,
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(DefaultKind),
            true,
        ),
        new OutputProperty(
            (l) => l.output.Bubble.color.names,
            'color',
            false,
            false,
            (expr, context) =>
                (expr instanceof Evaluate &&
                    expr.is(project.shares.output.Color, context)) ||
                expr instanceof NoneLiteral,
            (locales) => createColorLiteral(project, locales, 0, 0, 0),
        ),
        new OutputProperty(
            (l) => l.output.Bubble.background.names,
            'color',
            false,
            false,
            (expr, context) =>
                (expr instanceof Evaluate &&
                    expr.is(project.shares.output.Color, context)) ||
                expr instanceof NoneLiteral,
            (locales) => createColorLiteral(project, locales, 1, 0, 0),
        ),
        new OutputProperty(
            (l) => l.output.Bubble.size.names,
            new OutputPropertyRange(0.25, 8, 0.25, 'm', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.reuse(['m'])),
        ),
        new OutputProperty(
            (l) => l.output.Bubble.wrap.names,
            new OutputPropertyRange(1, 30, 1, 'm'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(DefaultWrap, Unit.reuse(['m'])),
            true,
        ),
    ];
}
