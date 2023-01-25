import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Translation from '@translation/Translation';
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
                explanation: (translation: Translation) =>
                    translation.conflict.MissingLanguage.primary,
            },
        };
    }
}
