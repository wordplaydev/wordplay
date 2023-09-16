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
import type Locale from '../locale/Locale';
import type { NameAndDoc, NameText } from '../locale/Locale';
import getPoseProperties from './PoseProperties';
import BooleanLiteral from '../nodes/BooleanLiteral';

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

export function getDurationProperty(locale: Locale): OutputProperty {
    return new OutputProperty(
        locale.output.Phrase.duration,
        new OutputPropertyRange(0, 2, 0.25, 's', 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0.25, Unit.create(['s']))
    );
}

export function getStyleProperty(locale: Locale): OutputProperty {
    return new OutputProperty(
        locale.output.Phrase.style,
        new OutputPropertyOptions(
            Object.values(locale.output.Easing).reduce(
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
                    ? expression.getValue([locale]).text
                    : undefined
        ),
        false,
        false,
        (expr) => expr instanceof TextLiteral,
        () => TextLiteral.make(DefaultStyle)
    );
}

// All output has these properties.
export default function getTypeOutputProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Phrase.size,
            new OutputPropertyRange(0.25, 32, 0.25, 'm'),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.create(['m']))
        ),
        new OutputProperty(
            locale.output.Phrase.face,
            new OutputPropertyOptions(
                [...SupportedFaces],
                true,
                (text: string) => TextLiteral.make(text),
                (expression: Expression | undefined) =>
                    expression instanceof TextLiteral
                        ? expression.getValue(project.locales).text
                        : undefined
            ),
            false,
            true,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(locale.ui.font.app)
        ),
        new OutputProperty(
            locale.output.Phrase.place,
            'place',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Place, context),
            (locale) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.Place.names.getPreferredNameString(
                            locale
                        ),
                        project.shares.output.Place
                    ),
                    [
                        NumberLiteral.make(0, Unit.create(['m'])),
                        NumberLiteral.make(0, Unit.create(['m'])),
                        NumberLiteral.make(0, Unit.create(['m'])),
                    ]
                )
        ),
        new OutputProperty(
            locale.output.Phrase.name,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('')
        ),
        new OutputProperty(
            locale.output.Phrase.selectable,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
        ...getPoseProperties(project, locale, true),
        getPoseProperty(project, locale.output.Phrase.entering),
        getPoseProperty(project, locale.output.Phrase.resting),
        getPoseProperty(project, locale.output.Phrase.moving),
        getPoseProperty(project, locale.output.Phrase.exiting),
        getDurationProperty(locale),
        getStyleProperty(locale),
    ];
}
