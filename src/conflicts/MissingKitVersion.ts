import type LocaleText from '@locale/LocaleText';
import KitBorrowConflict from '@conflicts/KitBorrowConflict';

/**
 * A kit is borrowed without saying which version, so there is nothing to pin to.
 *
 * A version is required rather than defaulting to the newest, because a kit keeps every
 * version it ever had and silently following the newest one would let someone else's edit
 * change what a program does.
 */
export class MissingKitVersion extends KitBorrowConflict {
    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.MissingKitVersion;

    getLocalePath() {
        return MissingKitVersion.LocalePath;
    }
}
