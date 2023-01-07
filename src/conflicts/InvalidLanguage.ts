import type Language from '../nodes/Language';
import type Token from '../nodes/Token';
import type Translation from '../translations/Translation';
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
        return { primary: this.code, secondary: this.language };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.InvalidLanguage.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
