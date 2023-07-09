import TextLiteral from '@nodes/TextLiteral';
import { getFirstName, type Locale } from '../locale/Locale';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';

export default function getPhraseProperties(locale: Locale): OutputProperty[] {
    return [
        {
            name: getFirstName(locale.output.Phrase.text.names),
            type: new OutputPropertyText(() => true),
            required: true,
            inherited: false,
            editable: (expr) => expr instanceof TextLiteral,
            create: () => TextLiteral.make(''),
        },
    ];
}
