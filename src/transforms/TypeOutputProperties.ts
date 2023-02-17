import { SupportedFonts } from '@native/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { createPoseLiteral, PoseType } from '@output/Pose';
import { SequenceType } from '@output/Sequence';
import { DefaultStyle } from '@output/TypeOutput';
import type { NameTranslation } from '@translation/Translation';
import en from '@translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';

function getTranslation(name: NameTranslation) {
    return typeof name === 'string' ? name : name[0];
}

function getPoseProperty(name: string): OutputProperty {
    return {
        name: getTranslation(name),
        type: 'pose',
        required: false,
        inherited: false,
        editable: (expr, context) =>
            expr instanceof Evaluate &&
            (expr.is(PoseType, context) || expr.is(SequenceType, context)),
        create: (languages) => createPoseLiteral(languages),
    };
}

export const DurationProperty: OutputProperty = {
    name: getTranslation(en.output.type.duration.name),
    type: new OutputPropertyRange(0, 2, 0.25, 's', 2),
    required: false,
    inherited: false,
    editable: (expr) => expr instanceof MeasurementLiteral,
    create: () => MeasurementLiteral.make(0.25, Unit.make(['s'])),
};

export const StyleProperty: OutputProperty = {
    name: getTranslation(en.output.type.style.name),
    type: new OutputPropertyOptions(
        Object.values(en.output.easing).reduce(
            (all: string[], next: NameTranslation) => [
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

// All output has these properties.
const TypeOutputProperties: OutputProperty[] = [
    {
        name: getTranslation(en.output.type.size.name),
        type: new OutputPropertyRange(0.25, 32, 0.25, 'm'),
        required: false,
        inherited: true,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1, Unit.make(['m'])),
    },
    {
        name: getTranslation(en.output.type.family.name),
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
    DurationProperty,
    StyleProperty,
    {
        name: getTranslation(en.output.type.name.name),
        type: new OutputPropertyText(() => true),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
    getPoseProperty(getTranslation(en.output.type.enter.name)),
    getPoseProperty(getTranslation(en.output.type.rest.name)),
    getPoseProperty(getTranslation(en.output.type.move.name)),
    getPoseProperty(getTranslation(en.output.type.exit.name)),
];

export default TypeOutputProperties;
