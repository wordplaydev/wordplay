import TextLiteral from '@nodes/TextLiteral';
import en from '@locale/locales/en';
import { getFirstName } from '../locale/Locale';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';

const PhraseProperties: OutputProperty[] = [
    {
        name: getFirstName(en.output.Phrase.text.names),
        type: new OutputPropertyText(() => true),
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
];

export default PhraseProperties;
