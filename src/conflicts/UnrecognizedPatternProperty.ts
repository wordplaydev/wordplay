import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type Node from '@nodes/Node';
import type PatternProperty from '@nodes/PatternProperty';

/**
 * A `/property` qualifier whose name is not a known registry name, script, or
 * canonical Unicode id (LANGUAGE.md). The matcher treats it as never matching.
 */
export default class UnrecognizedPatternProperty extends SimplePatternConflict<PatternProperty> {
    constructor(property: PatternProperty) {
        super(property, ConflictSeverity.Error);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternProperty.conflict.UnrecognizedPatternProperty;

    getLocalePath() {
        return UnrecognizedPatternProperty.LocalePath;
    }

    protected override focusNode(): Node {
        return this.node.name;
    }

    protected override inputs() {
        return { name: this.node.name.getText() };
    }
}
