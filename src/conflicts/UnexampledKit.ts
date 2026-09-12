import PublishedShareConflict from '@conflicts/PublishedShareConflict';
import type LocaleText from '@locale/LocaleText';
import type Program from '@nodes/Program';

/**
 * A published source with no `\…\` example anywhere in it (#8).
 *
 * This is what makes "a kit always has something to show" true: the registry renders one
 * as the kit's preview, so a kit without one is a tile with nothing on it.
 *
 * Speaks from the source's doc when it has one, since that is where a headline example
 * belongs, and from the program itself when it doesn't.
 */
export default class UnexampledKit extends PublishedShareConflict {
    constructor(program: Program) {
        super(program.docs.isEmpty() ? program : program.docs);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Program.conflict.UnexampledKit;

    getLocalePath() {
        return UnexampledKit.LocalePath;
    }
}
