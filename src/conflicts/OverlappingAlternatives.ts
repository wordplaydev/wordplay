import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type PatternSequence from '@nodes/PatternSequence';

/**
 * Two literal alternatives in the same `|` group where one is a prefix of the
 * other (e.g. `"cat" | "cats"`). Alternation is longest-match (LANGUAGE.md),
 * so the longer always wins and the shorter only matches text the longer can't —
 * worth surfacing for readers used to first-match regex alternation. Minor, never
 * blocking; matching is well-defined either way.
 */
export default class OverlappingAlternatives extends SimplePatternConflict<PatternSequence> {
    readonly shorter: string;
    readonly longer: string;

    constructor(sequence: PatternSequence, shorter: string, longer: string) {
        super(sequence, ConflictSeverity.Minor);
        this.shorter = shorter;
        this.longer = longer;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternSequence.conflict.OverlappingAlternatives;

    getLocalePath() {
        return OverlappingAlternatives.LocalePath;
    }

    protected override inputs() {
        return { shorter: this.shorter, longer: this.longer };
    }
}
