import Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Words from '@nodes/Words';

/**
 * A warning emitted when a @Phrase's markup requests a weight or italic style
 * that the chosen face doesn't ship. Static analysis only — see
 * analyzePhraseEvaluate.
 */
export default class UnsupportedFontFormat extends Conflict {
    readonly words: Words;
    readonly face: string;
    /** Localized name of the missing format, e.g., "extra bold" or "italic". */
    readonly format: string;

    constructor(words: Words, face: string, format: string) {
        super(true);
        this.words = words;
        this.face = face;
        this.format = format;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Words.conflict.UnsupportedFontFormat;

    getMessage() {
        return {
            node: this.words,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnsupportedFontFormat.LocalePath(l).explanation,
                    { face: this.face, format: this.format },
                ),
        };
    }

    getLocalePath() {
        return UnsupportedFontFormat.LocalePath;
    }
}
