import type LocaleText from '@locale/LocaleText';
import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class MissingLanguage extends Conflict {
    readonly language: Language;
    readonly slash: Token;

    constructor(language: Language, slash: Token) {
        super(false);
        this.language = language;
        this.slash = slash;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Language.conflict.MissingLanguage;

    getConflictingNodes() {
        return {
            primary: {
                node: this.language,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => MissingLanguage.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return MissingLanguage.LocalePath;
    }
}
