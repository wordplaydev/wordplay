import { SupportedFonts } from '@native/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { createPoseLiteral } from '@output/Pose';
import { DefaultStyle } from '@output/TypeOutput';
import { getFirstName, type Locale, type NameText } from '@locale/Locale';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';
import Reference from '../nodes/Reference';
import type Project from '../models/Project';

function getPoseProperty(project: Project, name: string): OutputProperty {
    return {
        name: getFirstName(name),
        type: 'pose',
        required: false,
        inherited: false,
        editable: (expr, context) =>
            expr instanceof Evaluate &&
            (expr.is(project.shares.output.pose, context) ||
                expr.is(project.shares.output.sequence, context)),
        create: (languages) => createPoseLiteral(project, languages),
    };
}

export function getDurationProperty(locale: Locale): OutputProperty {
    return {
        name: getFirstName(locale.output.Type.duration.names),
        type: new OutputPropertyRange(0, 2, 0.25, 's', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(0.25, Unit.make(['s'])),
    };
}

export function getStyleProperty(locale: Locale): OutputProperty {
    return {
        name: getFirstName(locale.output.Type.style.names),
        type: new OutputPropertyOptions(
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
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(DefaultStyle),
    };
}

// All output has these properties.
export default function getTypeOutputProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        {
            name: getFirstName(locale.output.Type.size.names),
            type: new OutputPropertyRange(0.25, 32, 0.25, 'm'),
            required: false,
            inherited: true,
            editable: (expr) => expr instanceof MeasurementLiteral,
            create: () => MeasurementLiteral.make(1, Unit.make(['m'])),
        },
        {
            name: getFirstName(locale.output.Type.family.names),
            type: new OutputPropertyOptions(
                [...SupportedFonts.map((font) => font.name)],
                true,
                (text: string) => TextLiteral.make(text),
                (expression: Expression | undefined) =>
                    expression instanceof TextLiteral
                        ? expression.getValue().text
                        : undefined
            ),
            required: false,
            inherited: true,
            editable: (expr) => expr instanceof TextLiteral,
            create: () => TextLiteral.make('Noto Sans'),
        },
        {
            name: getFirstName(locale.output.Type.place.names),
            type: 'place',
            required: false,
            inherited: false,
            editable: (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.place, context),
            create: (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.place.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.place
                    ),
                    []
                ),
        },
        {
            name: getFirstName(locale.output.Type.rotation.names),
            type: new OutputPropertyRange(0, 360, 1, '°'),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof MeasurementLiteral,
            create: () => MeasurementLiteral.make(0, Unit.make(['°'])),
        },
        getDurationProperty(locale),
        getStyleProperty(locale),
        {
            name: getFirstName(locale.output.Type.name.names),
            type: new OutputPropertyText(() => true),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof TextLiteral,
            create: () => TextLiteral.make(''),
        },
        getPoseProperty(project, getFirstName(locale.output.Type.enter.names)),
        getPoseProperty(project, getFirstName(locale.output.Type.rest.names)),
        getPoseProperty(project, getFirstName(locale.output.Type.move.names)),
        getPoseProperty(project, getFirstName(locale.output.Type.exit.names)),
    ];
}
