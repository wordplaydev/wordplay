import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                node: this.language,
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Language.conflict.MissingLanguage
                    ),
            },
        };
    }
}
