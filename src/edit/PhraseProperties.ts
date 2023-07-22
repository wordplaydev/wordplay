import TextLiteral from '@nodes/TextLiteral';
import type { Locale } from '../locale/Locale';
import OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';

export default function getPhraseProperties(locale: Locale): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Phrase.text,
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('')
        ),
    ];
}
