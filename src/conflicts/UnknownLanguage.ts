import type LocaleText from '@locale/LocaleText';
import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnknownLanguage extends Conflict {
    readonly language: Language;
    readonly code: Token;

    constructor(language: Language, code: Token) {
        super(true);
        this.language = language;
        this.code = code;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Language.conflict.UnknownLanguage;

    getConflictingNodes() {
        return {
            primary: {
                node: this.language,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownLanguage.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownLanguage.LocalePath;
    }
}
