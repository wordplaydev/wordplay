import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type PatternWord from '@nodes/PatternWord';
import type PatternWordEdge from '@nodes/PatternWordEdge';

/**
 * A word (`▭`) or word-edge (`┊`) atom with no locale tag. Word segmentation
 * has no locale-independent answer, so a locale is required (LANGUAGE.md).
 */
export default class MissingPatternLocale extends SimplePatternConflict<
    PatternWord | PatternWordEdge
> {
    constructor(word: PatternWord | PatternWordEdge) {
        super(word, ConflictSeverity.Error);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternWord.conflict.MissingPatternLocale;

    getLocalePath() {
        return MissingPatternLocale.LocalePath;
    }
}
