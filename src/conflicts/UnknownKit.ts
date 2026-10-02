import type LocaleText from '#locale/LocaleText.ts';
import KitBorrowConflict from '#conflicts/KitBorrowConflict.ts';

/**
 * A borrowed kit, or the version of it asked for, does not exist.
 */
export class UnknownKit extends KitBorrowConflict {
    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.UnknownKit;

    getLocalePath() {
        return UnknownKit.LocalePath;
    }
}
