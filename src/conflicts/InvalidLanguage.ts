import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

export default class InvalidLanguage extends Conflict {
    readonly language: Language;
    readonly code: Token;

    constructor(language: Language, code: Token) {
        super(true);
        this.language = language;
        this.code = code;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.code,
                explanation: (translation: Locale) =>
                    translation.conflict.InvalidLanguage.primary,
            },
        };
    }
}
