import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Language.conflict.MissingLanguage
                        )
                    ),
            },
        };
    }
}
