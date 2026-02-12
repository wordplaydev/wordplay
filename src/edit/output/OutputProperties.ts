import { Faces, getFaceDescription, type Face } from '@basis/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import NumberLiteral from '@nodes/NumberLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { DefaultStyle } from '@output/Output';
import { createPoseLiteral } from '@output/Pose';
import type Project from '../../db/projects/Project';
import type Locales from '../../locale/Locales';
import type { LocaleTextsAccessor } from '../../locale/Locales';
import type { NameText } from '../../locale/LocaleText';
import BooleanLiteral from '../../nodes/BooleanLiteral';
import Reference from '../../nodes/Reference';
import OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';
import OutputPropertyText from './OutputPropertyText';
import getPoseProperties from './PoseProperties';

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
            Object.values(locales.get((l) => l.output.Easing))
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
        new OutputProperty(
            (l) => l.output.Phrase.face.names,
            new OutputPropertyOptions<{ face: { name: string; face: Face } }>(
                Object.entries(Faces).map(([name, face]) => ({
                    value: name,
                    label: getFaceDescription(name, face),
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
            () => TextLiteral.make(locales.get((l) => l.ui.font.app)),
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
        ...getOutputProperties(project, locales),
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
