import { SupportedFonts } from '@native/Fonts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import Reference from '@nodes/Reference';
import TextLiteral from '@nodes/TextLiteral';
import Unit from '@nodes/Unit';
import { PoseType } from '@output/Pose';
import { SequenceType } from '@output/Sequence';
import { DefaultStyle } from '@output/TypeOutput';
import type { NameTranslation } from '@translation/Translation';
import en from '@translation/translations/en';
import { ColorType, createColorLiteral } from '../output/Color';
import { RowType } from '@output/Row';
import { StackType } from '@output/Stack';
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
        create: (languages) =>
            Evaluate.make(
                Reference.make(
                    PoseType.names.getTranslation(languages),
                    PoseType
                ),
                []
            ),
    };
}

// All output has these properties.
export const TypeOutputProperties: OutputProperty[] = [
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
    {
        name: getTranslation(en.output.type.duration.name),
        type: new OutputPropertyRange(0, 2, 0.25, 's', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(0.25, Unit.make(['s'])),
    },
    {
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
    },
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

export const GroupProperties: OutputProperty[] = [
    {
        name: 'layout',
        type: new OutputPropertyOptions(
            [RowType, StackType].map((type) => `${type.names.getNames()[0]}`),
            false,
            (text: string) => Evaluate.make(Reference.make(text), []),
            (expression: Expression | undefined) =>
                expression instanceof Evaluate
                    ? expression.func.toWordplay()
                    : undefined
        ),
        required: true,
        inherited: false,
        editable: () => true,
        create: (languages) =>
            Evaluate.make(
                Reference.make(
                    StackType.names.getTranslation(languages),
                    StackType
                ),
                []
            ),
    },
];

export const VerseProperties: OutputProperty[] = [
    {
        name: 'background',
        type: 'color' as const,
        required: false,
        inherited: false,
        editable: (expr, context) =>
            expr instanceof Evaluate && expr.is(ColorType, context),
        create: (languages) => createColorLiteral(languages, 0.5, 100, 180),
    },
];

export const PhraseProperties: OutputProperty[] = [
    {
        name: getTranslation(en.output.phrase.text.name),
        type: new OutputPropertyText(() => true),
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
];
