import type LocaleText from '@locale/LocaleText';
import KitBorrowConflict from '@conflicts/KitBorrowConflict';

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
