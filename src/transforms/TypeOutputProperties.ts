import { SupportedFonts } from '@native/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { createPoseLiteral, PoseType } from '@output/Pose';
import { SequenceType } from '@output/Sequence';
import { DefaultStyle } from '@output/TypeOutput';
import { getFirstName, type NameTranslation } from '@translation/Translation';
import en from '@translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import OutputPropertyOptions from './OutputPropertyOptions';
import OutputPropertyRange from './OutputPropertyRange';
import { PlaceType } from '../output/Place';
import Reference from '../nodes/Reference';

function getPoseProperty(name: string): OutputProperty {
    return {
        name: getFirstName(name),
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
    name: getFirstName(en.output.type.duration.names),
    type: new OutputPropertyRange(0, 2, 0.25, 's', 2),
    required: false,
    inherited: false,
    editable: (expr) => expr instanceof MeasurementLiteral,
    create: () => MeasurementLiteral.make(0.25, Unit.make(['s'])),
};

export const StyleProperty: OutputProperty = {
    name: getFirstName(en.output.type.style.names),
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
        name: getFirstName(en.output.type.size.names),
        type: new OutputPropertyRange(0.25, 32, 0.25, 'm'),
        required: false,
        inherited: true,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1, Unit.make(['m'])),
    },
    {
        name: getFirstName(en.output.type.family.names),
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
        name: getFirstName(en.output.type.place.names),
        type: 'place',
        required: false,
        inherited: false,
        editable: (expr, context) =>
            expr instanceof Evaluate && expr.is(PlaceType, context),
        create: (languages) =>
            Evaluate.make(
                Reference.make(
                    PlaceType.names.getTranslation(languages),
                    PlaceType
                ),
                []
            ),
    },
    {
        name: getFirstName(en.output.type.rotation.names),
        type: new OutputPropertyRange(0, 360, 1, '°'),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(0, Unit.make(['°'])),
    },
    DurationProperty,
    StyleProperty,
    {
        name: getFirstName(en.output.type.name.names),
        type: new OutputPropertyText(() => true),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
    getPoseProperty(getFirstName(en.output.type.enter.names)),
    getPoseProperty(getFirstName(en.output.type.rest.names)),
    getPoseProperty(getFirstName(en.output.type.move.names)),
    getPoseProperty(getFirstName(en.output.type.exit.names)),
];

export default TypeOutputProperties;
