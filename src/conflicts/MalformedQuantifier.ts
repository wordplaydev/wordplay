import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type PatternQuantifier from '@nodes/PatternQuantifier';

/**
 * A quantifier whose bounds can never be satisfied — e.g. a range `N–M` with
 * `min > max` (LANGUAGE.md). The matcher would never succeed.
 */
export default class MalformedQuantifier extends SimplePatternConflict<PatternQuantifier> {
    constructor(quantifier: PatternQuantifier) {
        super(quantifier, ConflictSeverity.Warning);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternQuantifier.conflict.MalformedQuantifier;

    getLocalePath() {
        return MalformedQuantifier.LocalePath;
    }
}
