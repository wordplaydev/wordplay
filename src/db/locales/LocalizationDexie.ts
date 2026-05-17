import { browser } from '$app/environment';
import Dexie, { type Table } from 'dexie';
import { writable } from 'svelte/store';

interface LocaleEdit {
    /** BCP-47 locale string the edit targets (e.g. "fr-FR"). */
    locale: string;
    /** Serialized LocalePath, e.g. "ui.localize.button.edit", or a tutorial path. */
    path: string;
    value: string;
}

class LocalizationDexie extends Dexie {
    edits!: Table<LocaleEdit, [string, string]>;

    constructor() {
        super('wordplay-localization');
        // v1 used `path` as the primary key, with no locale dimension.
        this.version(1).stores({ edits: 'path' });
        // v2 keys edits by [locale, path] so a contributor reviewing one locale
        // can't overwrite an in-progress edit they made under a different one.
        // Existing v1 rows have no locale and would be orphaned by the composite
        // key, so we clear the table on upgrade — in-flight edits are local and
        // ephemeral; a contributor who's mid-bundle just re-enters them.
        this.version(2)
            .stores({ edits: '[locale+path], locale' })
            .upgrade(async (tx) => {
                await tx.table('edits').clear();
            });
    }
}

/** Reactive store mirroring all locally-saved locale edits, keyed by locale
 *  string → map of (path → value). Components read the inner map for the
 *  active locale so edits made under one locale don't appear under another. */
export const localeEdits = writable<Map<string, Map<string, string>>>(
    new Map(),
);

let db: LocalizationDexie | undefined;

if (browser) {
    db = new LocalizationDexie();
    db.edits.toArray().then((all) => {
        const next = new Map<string, Map<string, string>>();
        for (const { locale, path, value } of all) {
            let inner = next.get(locale);
            if (inner === undefined) {
                inner = new Map();
                next.set(locale, inner);
            }
            inner.set(path, value);
        }
        localeEdits.set(next);
    });
}

/** Remove every edit for `locale`, or every edit across all locales if no
 *  locale is given. */
export async function deleteAllLocaleEdits(locale?: string): Promise<void> {
    if (!db) return;
    if (locale === undefined) {
        localeEdits.set(new Map());
        await db.edits.clear();
    } else {
        localeEdits.update((map) => {
            const next = new Map(map);
            next.delete(locale);
            return next;
        });
        await db.edits.where('locale').equals(locale).delete();
    }
}

export async function deleteLocaleEdit(
    locale: string,
    path: string,
): Promise<void> {
    if (!db) return;
    localeEdits.update((map) => {
        const next = new Map(map);
        const inner = next.get(locale);
        if (inner !== undefined) {
            const innerNext = new Map(inner);
            innerNext.delete(path);
            if (innerNext.size === 0) next.delete(locale);
            else next.set(locale, innerNext);
        }
        return next;
    });
    await db.edits.delete([locale, path]);
}

export async function saveLocaleEdit(
    locale: string,
    path: string,
    value: string,
): Promise<void> {
    if (!db) return;
    // Update the store immediately so the UI reacts without waiting for Dexie.
    localeEdits.update((map) => {
        const next = new Map(map);
        const inner = new Map(next.get(locale) ?? []);
        inner.set(path, value);
        next.set(locale, inner);
        return next;
    });
    await db.edits.put({ locale, path, value });
}
