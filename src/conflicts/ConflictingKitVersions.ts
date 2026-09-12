import type LocaleText from '@locale/LocaleText';
import KitBorrowConflict from '@conflicts/KitBorrowConflict';

/**
 * One kit is borrowed at two different versions in one source.
 *
 * A project resolves a kit once, so two versions cannot both be in scope — and if they
 * could, the two copies of every export would be different definitions with the same name.
 */
export class ConflictingKitVersions extends KitBorrowConflict {
    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.ConflictingKitVersions;

    getLocalePath() {
        return ConflictingKitVersions.LocalePath;
    }
}
