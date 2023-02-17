import TextLiteral from '@nodes/TextLiteral';
import en from '@translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyText from './OutputPropertyText';

const PhraseProperties: OutputProperty[] = [
    {
        name: getTranslation(en.output.phrase.text.name),
        type: new OutputPropertyText(() => true),
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof TextLiteral,
        create: () => TextLiteral.make(''),
    },
];

export default PhraseProperties;
function getTranslation(name: any): string {
    throw new Error('Function not implemented.');
}
