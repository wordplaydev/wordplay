import TextLiteral from '@nodes/TextLiteral';
import OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import Language from '../nodes/Language';
import OutputPropertyRange from './OutputPropertyRange';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import OutputPropertyOptions from './OutputPropertyOptions';
import { getTypeOutputProperties } from './OutputProperties';
import type Project from '../models/Project';
import type Locales from '../locale/Locales';
import {
    HorizontalLayout,
    VerticalLeftRightLayout,
    VerticalRightLeftLayout,
} from '@locale/Scripts';
import FormattedLiteral from '@nodes/FormattedLiteral';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';

export default function getPhraseProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    let phraseProperties = [
        new OutputProperty(
            locales.get((l) => l.output.Phrase.text),
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) =>
                expr instanceof TextLiteral || expr instanceof FormattedLiteral,
            (locales) =>
                TextLiteral.make('', Language.make(locales.getLanguages()[0])),
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.wrap),
            new OutputPropertyRange(1, 30, 1, 'm'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('10', Unit.meters()),
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.alignment),
            new OutputPropertyOptions(
                ['<', '|', '>'],
                true,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ??
                    '|',
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('|'),
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.direction),
            new OutputPropertyOptions(
                [
                    HorizontalLayout,
                    VerticalRightLeftLayout,
                    VerticalLeftRightLayout,
                ],
                false,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ??
                    HorizontalLayout,
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(HorizontalLayout),
        ),
        new OutputProperty(
            locales.get((l) => l.output.Phrase.aura),
            'aura',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Aura, context),
            () =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Aura.names),
                        project.shares.output.Aura,
                    ),
                    [],
                ),
        ),
    ];

    const typeProperties = getTypeOutputProperties(project, locales);

    // The font face makes more sense right next to the text, so we reorder it here.
    const faceIndex = typeProperties.findIndex(
        (prop) => prop.name === locales.get((l) => l.output.Phrase.face),
    );
    if (faceIndex >= 0) {
        const faceProperty = typeProperties[faceIndex];
        typeProperties.splice(faceIndex, 1);
        phraseProperties = [
            ...phraseProperties.slice(0, 1),
            faceProperty,
            ...phraseProperties.slice(1),
        ];
    }

    return [...phraseProperties, ...typeProperties];
}
