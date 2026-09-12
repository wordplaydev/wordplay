import PublishedShareConflict from '@conflicts/PublishedShareConflict';
import type LocaleText from '@locale/LocaleText';
import type Token from '@nodes/Token';

/**
 * A `↑` definition in a published source that is documented but never shown in use (#8).
 *
 * Only for things you *call*. A value speaks for itself — a colour is a colour — but a
 * function or a structure is a set of inputs someone has to guess at, and a worked `\…\`
 * example is the difference between documentation and a description.
 */
export default class UnexampledShare extends PublishedShareConflict {
    constructor(share: Token) {
        super(share);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Program.conflict.UnexampledShare;

    getLocalePath() {
        return UnexampledShare.LocalePath;
    }
}
