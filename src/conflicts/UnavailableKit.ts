import type LocaleText from '@locale/LocaleText';
import KitBorrowConflict from '@conflicts/KitBorrowConflict';

/**
 * A borrowed kit exists but this creator may not read it — it was never published, or it
 * was taken down.
 */
export class UnavailableKit extends KitBorrowConflict {
    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.UnavailableKit;

    getLocalePath() {
        return UnavailableKit.LocalePath;
    }
}
