import { SupportedFonts } from '@native/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import NumberLiteral from '@nodes/NumberLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { createPoseLiteral } from '@output/Pose';
import { DefaultStyle } from '@output/TypeOutput';
import OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';
import Reference from '../nodes/Reference';
import type Project from '../models/Project';
import type { Locale, NameAndDoc, NameText } from '../locale/Locale';
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
            (expr.is(project.shares.output.pose, context) ||
                expr.is(project.shares.output.sequence, context)),
        (languages) => createPoseLiteral(project, languages)
    );
}

export function getDurationProperty(locale: Locale): OutputProperty {
    return new OutputProperty(
        locale.output.Type.duration,
        new OutputPropertyRange(0, 2, 0.25, 's', 2),
        false,
        false,
        (expr) => expr instanceof NumberLiteral,
        () => NumberLiteral.make(0.25, Unit.make(['s']))
    );
}

export function getStyleProperty(locale: Locale): OutputProperty {
    return new OutputProperty(
        locale.output.Type.style,
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
                    ? expression.getValue().text
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
            locale.output.Type.size,
            new OutputPropertyRange(0.25, 32, 0.25, 'm'),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.make(['m']))
        ),
        new OutputProperty(
            locale.output.Type.family,
            new OutputPropertyOptions(
                [...SupportedFonts.map((font) => font.name)],
                true,
                (text: string) => TextLiteral.make(text),
                (expression: Expression | undefined) =>
                    expression instanceof TextLiteral
                        ? expression.getValue().text
                        : undefined
            ),
            false,
            true,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('Noto Sans')
        ),
        new OutputProperty(
            locale.output.Type.place,
            'place',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.place, context),
            (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.place.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.place
                    ),
                    []
                )
        ),
        new OutputProperty(
            locale.output.Type.name,
            new OutputPropertyText(() => true),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('')
        ),
        new OutputProperty(
            locale.output.Type.selectable,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
        ...getPoseProperties(project, locale),
        getPoseProperty(project, locale.output.Type.enter),
        getPoseProperty(project, locale.output.Type.rest),
        getPoseProperty(project, locale.output.Type.move),
        getPoseProperty(project, locale.output.Type.exit),
        getDurationProperty(locale),
        getStyleProperty(locale),
    ];
}
