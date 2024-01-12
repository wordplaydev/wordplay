import TextLiteral from '@nodes/TextLiteral';
import type Locale from '../locale/Locale';
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
import getShadowProperties from './ShadowProperties';
import Evaluate from '../nodes/Evaluate';
import { createColorLiteral } from '../output/Color';

export default function getPhraseProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Phrase.text,
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) => expr instanceof TextLiteral || expr instanceof Docs,
            (locales) =>
                TextLiteral.make('', Language.make(locales[0].language))
        ),
        new OutputProperty(
            locale.output.Phrase.wrap,
            new OutputPropertyRange(1, 30, 1, 'm'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('10', Unit.meters())
        ),
        new OutputProperty(
            locale.output.Phrase.alignment,
            new OutputPropertyOptions(
                ['<', '|', '>'],
                true,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ?? '|'
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('|')
        ),
        new OutputProperty(
            locale.output.Phrase.shadow,
            'aura',
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('|')
        ),
        // ...getShadowProperties(project, locale),
        ...getTypeOutputProperties(project, locale),
    ];
}
