import { ConflictSeverity } from '#conflicts/Conflict.ts';
import SimplePatternConflict from '#conflicts/SimplePatternConflict.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Node from '#nodes/Node.ts';
import type PatternCapture from '#nodes/PatternCapture.ts';

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
