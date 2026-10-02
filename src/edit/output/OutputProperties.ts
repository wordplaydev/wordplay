import { Faces, getFaceDescription, type Face } from '#basis/faces/Fonts.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import Unit from '#nodes/Unit.ts';
import { DefaultStyle } from '#output/Output/Output.ts';
import { createPoseLiteral } from '#output/animation/Pose.ts';
import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import type { LocaleTextsAccessor } from '#locale/Locales.ts';
import type { NameText } from '#locale/LocaleText.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import Reference from '#nodes/Reference.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyOptions from '#edit/output/OutputPropertyOptions.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';
import OutputPropertyText from '#edit/output/OutputPropertyText.ts';
import getPoseProperties from '#edit/output/PoseProperties.ts';

function getPoseProperty(
    project: Project,
    name: LocaleTextsAccessor,
): OutputProperty {
    return new OutputProperty(
        name,
        'pose',
        false,
        false,
        (expr, context) =>
            expr instanceof Evaluate &&
            (expr.is(project.shares.output.Pose, context) ||
                expr.is(project.shares.output.Sequence, context)),
        (locales) => createPoseLiteral(project, locales),
    );
}

export function getDurationProperty(locales: Locales): OutputProperty {
    return new OutputProperty(
        (l) => l.output.Phrase.duration.names,
        new OutputPropertyRange(0, 2, 0.25, 's', 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0.25, Unit.create(['s'])),
    );
}

export function getStyleProperty(locales: Locales): OutputProperty {
    return new OutputProperty(
        (l) => l.output.Phrase.style.names,
        new OutputPropertyOptions(
            Object.values(locales.getTextStructure((l) => l.output.Easing))
                .reduce(
                    (all: string[], next: NameText) => [
                        ...all,
                        ...(Array.isArray(next) ? next : [next]),
                    ],
                    [],
                )
                .map((name) => ({ value: name, label: name })),
            true,
            (text: string) => TextLiteral.make(text),
            (expression: Expression | undefined) =>
                expression instanceof TextLiteral
                    ? expression.getValue(locales.getLocales()).text
                    : undefined,
        ),
        false,
        false,
        (expr) => expr instanceof TextLiteral,
        () => TextLiteral.make(DefaultStyle),
    );
}

// All type output has these properties.
export function getTypeOutputProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Phrase.size.names,
            new OutputPropertyRange(0.25, 32, 0.25, 'm', 2),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.meters()),
        ),
        ...getFaceAndPlaceProperties(project, locales),
        new OutputProperty(
            (l) => l.output.Phrase.matter.names,
            'structure',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Matter, context),
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Matter.names),
                        project.shares.output.Matter,
                    ),
                    [],
                ),
        ),
        ...getOutputProperties(project, locales),
    ];
}

/**
 * The face a thing's glyphs are drawn in, and the place it sits.
 *
 * Shared because they are the two of the type block that aren't about text: an `Image`
 * has both, but no `size` — its width and height are its own inputs — and no `matter`.
 */
export function getFaceAndPlaceProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Phrase.face.names,
            new OutputPropertyOptions<{ face: { name: string; face: Face } }>(
                Object.entries(Faces).map(([name, face]) => ({
                    value: name,
                    label: getFaceDescription(locales, name, face),
                    face: { name, face },
                })),
                true,
                (text: string) => TextLiteral.make(text),
                (expression: Expression | undefined) =>
                    expression instanceof TextLiteral
                        ? expression.getValue(locales.getLocales()).text
                        : undefined,
            ),
            false,
            true,
            (expr) => expr instanceof TextLiteral,
            () =>
                TextLiteral.make(
                    locales.getUnannotatedPrimaryText((l) => l.ui.font.app),
                ),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.place.names,
            'place',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                (expr.is(project.shares.output.Place, context) ||
                    expr.is(project.shares.input.Motion, context) ||
                    expr.is(project.shares.input.Placement, context)),
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Place.names),
                        project.shares.output.Place,
                    ),
                    [
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                    ],
                ),
        ),
    ];
}

/** All output has these properties */
// All type output has these properties, in this order.
export function getOutputProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Phrase.name.names,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(''),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.selectable.names,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false),
        ),
        ...getPoseProperties(project, locales, true),
        getPoseProperty(project, (l) => l.output.Phrase.entering.names),
        getPoseProperty(project, (l) => l.output.Phrase.resting.names),
        getPoseProperty(project, (l) => l.output.Phrase.moving.names),
        getPoseProperty(project, (l) => l.output.Phrase.exiting.names),
        getDurationProperty(locales),
        getStyleProperty(locales),
    ];
}
