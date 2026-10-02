import { ConflictSeverity } from '#conflicts/Conflict.ts';
import SimplePatternConflict from '#conflicts/SimplePatternConflict.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type PatternLiteral from '#nodes/PatternLiteral.ts';

/** A pattern literal `⣿⣿` with no atoms — it matches nothing useful (LANGUAGE.md). */
export default class EmptyPattern extends SimplePatternConflict<PatternLiteral> {
    constructor(pattern: PatternLiteral) {
        super(pattern, ConflictSeverity.Warning);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternLiteral.conflict.EmptyPattern;

    getLocalePath() {
        return EmptyPattern.LocalePath;
    }
}
