import type Language from '../nodes/Language';
import type Token from '../nodes/Token';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
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
        return { primary: this.code, secondary: [this.language] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `This isn't a valid language code, so it won't appear anywhere.`,
        };
    }
}
