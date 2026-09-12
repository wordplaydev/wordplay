import PublishedShareConflict from '@conflicts/PublishedShareConflict';
import type LocaleText from '@locale/LocaleText';
import type Token from '@nodes/Token';

/**
 * A `↑` definition in a published source with nothing explaining it (#8).
 *
 * Raised only in a source a project actually publishes. `↑` also means "share with my own
 * other sources", where demanding an explanation for strangers would be noise; the moment
 * other people can read it, the rule applies. See `getPublishedShareConflicts`.
 */
export default class UndocumentedShare extends PublishedShareConflict {
    constructor(share: Token) {
        super(share);
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Program.conflict.UndocumentedShare;

    getLocalePath() {
        return UndocumentedShare.LocalePath;
    }
}
