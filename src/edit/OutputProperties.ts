import { SupportedFaces } from '@basis/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import NumberLiteral from '@nodes/NumberLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { createPoseLiteral } from '@output/Pose';
import { DefaultStyle } from '@output/Output';
import OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';
import Reference from '../nodes/Reference';
import type Project from '../models/Project';
import type { NameAndDoc, NameText } from '../locale/Locale';
import getPoseProperties from './PoseProperties';
import BooleanLiteral from '../nodes/BooleanLiteral';
import type Locales from '../locale/Locales';

function getPoseProperty(project: Project, name: NameAndDoc): OutputProperty {
    return new OutputProperty(
        name,
        'pose',
        false,
        false,
        (expr, context) =>
            expr instanceof Evaluate &&
            (expr.is(project.shares.output.Pose, context) ||
                expr.is(project.shares.output.Sequence, context)),
        (locales) => createPoseLiteral(project, locales)
    );
}

export function getDurationProperty(locales: Locales): OutputProperty {
    return new OutputProperty(
        locales.get((l) => l.output.Phrase.duration),
        new OutputPropertyRange(0, 2, 0.25, 's', 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0.25, Unit.create(['s']))
    );
}

export function getStyleProperty(locales: Locales): OutputProperty {
    return new OutputProperty(
        locales.get((l) => l.output.Phrase.style),
        new OutputPropertyOptions(
            Object.values(locales.get((l) => l.output.Easing)).reduce(
                (all: string[], next: NameText) => [
                    ...all,
                    ...(Array.isArray(next) ? next : [next]),
                ],
                []
            ),
            true,
            (text: string) => TextLiteral.make(text),
            (expression: Expression | undefined) =>
                expression instanceof TextLiteral
                    ? expression.getValue(locales).text
                    : undefined
        ),
        false,
        false,
        (expr) => expr instanceof TextLiteral,
        () => TextLiteral.make(DefaultStyle)
    );
}

// All type output has these properties.
export function getTypeOutputProperties(
    project: Project,
    locales: Locales
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Phrase.size),
            new OutputPropertyRange(0.25, 32, 0.25, 'm', 2),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.meters())
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.face),
            new OutputPropertyOptions(
                [...SupportedFaces],
                true,
                (text: string) => TextLiteral.make(text),
                (expression: Expression | undefined) =>
                    expression instanceof TextLiteral
                        ? expression.getValue(locales).text
                        : undefined
            ),
            false,
            true,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(locales.get((l) => l.ui.font.app))
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.place),
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
                        project.shares.output.Place
                    ),
                    [
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                        NumberLiteral.make(0, Unit.meters()),
                    ]
                )
        ),
        ...getOutputProperties(project, locales),
    ];
}

/** All output has these properties */
// All type output has these properties, in this order.
export function getOutputProperties(
    project: Project,
    locales: Locales
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Phrase.name),
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('')
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.selectable),
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
        ...getPoseProperties(project, locales, true),
        getPoseProperty(
            project,
            locales.get((l) => l.output.Phrase.entering)
        ),
        getPoseProperty(
            project,
            locales.get((l) => l.output.Phrase.resting)
        ),
        getPoseProperty(
            project,
            locales.get((l) => l.output.Phrase.moving)
        ),
        getPoseProperty(
            project,
            locales.get((l) => l.output.Phrase.exiting)
        ),
        getDurationProperty(locales),
        getStyleProperty(locales),
    ];
}
