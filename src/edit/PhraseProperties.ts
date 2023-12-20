import TextLiteral from '@nodes/TextLiteral';
import OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';
import Language from '../nodes/Language';
import Docs from '../nodes/Docs';
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

export default function getPhraseProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Phrase.text),
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) => expr instanceof TextLiteral || expr instanceof Docs,
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
        ...getTypeOutputProperties(project, locales),
    ];
}
