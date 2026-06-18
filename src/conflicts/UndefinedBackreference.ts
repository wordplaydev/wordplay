import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type PatternBackref from '@nodes/PatternBackref';

/**
 * A bare name in a pattern that is neither an earlier capture's name nor a
 * known named class/property (LANGUAGE.md). It can never match.
 */
export default class UndefinedBackreference extends SimplePatternConflict<PatternBackref> {
    constructor(backref: PatternBackref) {
        super(backref, ConflictSeverity.Error);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternBackref.conflict.UndefinedBackreference;

    getLocalePath() {
        return UndefinedBackreference.LocalePath;
    }

    protected override inputs() {
        return { name: this.node.name.getText() };
    }
}
