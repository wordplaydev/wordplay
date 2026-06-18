import { ConflictSeverity } from '@conflicts/Conflict';
import SimplePatternConflict from '@conflicts/SimplePatternConflict';
import type LocaleText from '@locale/LocaleText';
import type Node from '@nodes/Node';
import type PatternCapture from '@nodes/PatternCapture';

/**
 * Two captures in the same pattern share a name (LANGUAGE.md). The second
 * would silently overwrite the first in the result's `groups` map.
 */
export default class DuplicateCaptureName extends SimplePatternConflict<PatternCapture> {
    constructor(capture: PatternCapture) {
        super(capture, ConflictSeverity.Warning);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.PatternCapture.conflict.DuplicateCaptureName;

    getLocalePath() {
        return DuplicateCaptureName.LocalePath;
    }

    protected override focusNode(): Node {
        return this.node.name;
    }

    protected override inputs() {
        return { name: this.node.name.getText() };
    }
}
