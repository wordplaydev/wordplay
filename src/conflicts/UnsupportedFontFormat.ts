import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import Words from '@nodes/Words';

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

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Strip the formatting markers (open/close tokens) so the words
        // render plain, without the missing format.
        const plain = new Words(undefined, this.words.segments, undefined);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnsupportedFontFormat.LocalePath(l).resolution,
                        { face: this.face, format: this.format },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.words, plain],
                    ]),
                    newNode: plain,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnsupportedFontFormat.LocalePath;
    }
}
