import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export default class MissingLanguage extends Conflict {
    readonly language: Language;
    readonly slash: Token;

    constructor(language: Language, slash: Token) {
        super(false);
        this.language = language;
        this.slash = slash;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.slash,
                explanation: (translation: Locale) =>
                    translation.conflict.MissingLanguage.primary,
            },
        };
    }
}
