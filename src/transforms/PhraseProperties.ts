import TextLiteral from '@nodes/TextLiteral';
import en from '@translation/translations/en';
import { getFirstName } from '../translation/Translation';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';

const PhraseProperties: OutputProperty[] = [
    {
        name: getFirstName(en.output.phrase.text.names),
        type: new OutputPropertyText(() => true),
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
];

export default PhraseProperties;
