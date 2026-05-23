import type LocaleText from '@locale/LocaleText';
import type Language from '@nodes/Language';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict from '@conflicts/Conflict';

/** Fires when a multilingual language tag (e.g. `/es_en_es`) repeats the
 *  same language code. The two duplicate token positions are reported so the
 *  IDE can highlight both. */
export default class DuplicateLanguage extends Conflict {
    readonly language: Language;
    readonly first: Token;
    readonly second: Token;

    constructor(language: Language, first: Token, second: Token) {
        super(true);
        this.language = language;
        this.first = first;
        this.second = second;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Language.conflict.DuplicateLanguage;

    getMessage() {
        return {
            node: this.second,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => DuplicateLanguage.LocalePath(l).explanation,
                    { code: this.second.getText() },
                ),
        };
    }

    getLocalePath() {
        return DuplicateLanguage.LocalePath;
    }
}
