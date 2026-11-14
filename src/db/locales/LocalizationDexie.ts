import { browser } from '$app/env';
import Dexie, { type Table } from 'dexie';
import { get, writable } from 'svelte/store';

interface LocaleEdit {
    /** BCP-47 locale string the edit targets (e.g. "fr-FR"). */
    locale: string;
    /** Serialized LocalePath, e.g. "ui.localize.button.edit", or a tutorial path. */
    path: string;
    /** The revised text, or the whole revised list for a path whose value is a
     *  list a locale writes for itself — today only a glossary term's `forms`.
     *  A list is one thing a translator edits, so it is one edit: two edits in
     *  one bundle can't then fight over the same index. The value isn't indexed
     *  and an array is structured-cloneable, so this needs no Dexie version. */
    value: string | string[];
}

class LocalizationDexie extends Dexie {
    edits!: Table<LocaleEdit, [string, string]>;

    constructor() {
        super('wordplay-localization');
        // v1 used `path` as the primary key, with no locale dimension.
        this.version(1).stores({ edits: 'path' });
        // Dexie doesn't allow changing a table's primary key in-place, so we
        // drop the table at v2 and recreate it with a composite [locale, path]
        // key at v3. In-flight edits are local and ephemeral; a contributor
        // who's mid-bundle just re-enters them.
        this.version(2).stores({ edits: null });
        // v3 keys edits by [locale, path] so a contributor reviewing one
        // locale can't overwrite an in-progress edit they made under a
        // different one.
        this.version(3).stores({ edits: '[locale+path], locale' });
    }
}

/** Reactive store mirroring all locally-saved locale edits, keyed by locale
 *  string → map of (path → value). Components read the inner map for the
 *  active locale so edits made under one locale don't appear under another. */
export const localeEdits = writable<
    Map<string, Map<string, string | string[]>>
>(new Map());

let db: LocalizationDexie | undefined;

if (browser) {
    db = new LocalizationDexie();
    db.edits.toArray().then((all) => {
        const next = new Map<string, Map<string, string | string[]>>();
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

/**
 * Every locale edit held on this device, for an account export (#152).
 *
 * Read from the table rather than from the `localeEdits` store, because the
 * store is filled asynchronously on first load and an export run before that
 * finishes would quietly report none. This work exists on exactly one device
 * and in no cloud record, so silently exporting nothing would be the worst
 * kind of loss.
 */
export async function allLocaleEdits(): Promise<LocaleEdit[]> {
    return db ? await db.edits.toArray() : [];
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

/** What became of a localization edit, for the feedback beside the field that made it. `at`
 *  tells two identical results apart, so saving the same text twice still confirms twice. */
export type LocaleEditResult = {
    kind: 'saved' | 'reverted' | 'failed';
    /** The text that was saved, or that is back after a revert. */
    text: string;
    at: number;
};

/** Run a durable write after an optimistic store update, and put the store back if the write
 *  fails, so the page never shows an edit that a reload would lose. */
export async function durably(
    write: () => Promise<unknown>,
    before: Map<string, Map<string, string | string[]>>,
): Promise<void> {
    try {
        await write();
    } catch (error) {
        localeEdits.set(before);
        throw error;
    }
}

export async function deleteLocaleEdit(
    locale: string,
    path: string,
): Promise<void> {
    if (!db) return;
    const edits = db.edits;
    const before = get(localeEdits);
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
    await durably(() => edits.delete([locale, path]), before);
}

export async function saveLocaleEdit(
    locale: string,
    path: string,
    value: string | string[],
): Promise<void> {
    if (!db) return;
    const edits = db.edits;
    const before = get(localeEdits);
    // Update the store immediately so the UI reacts without waiting for Dexie.
    localeEdits.update((map) => {
        const next = new Map(map);
        const inner = new Map<string, string | string[]>(
            next.get(locale) ?? [],
        );
        inner.set(path, value);
        next.set(locale, inner);
        return next;
    });
    await durably(() => edits.put({ locale, path, value }), before);
}

/**
 * Save `text` as the edit at `path`, or remove the edit when `text` is the official text again,
 * and say what happened. Undefined means nothing changed, which a field that commits on blur
 * hits constantly and should not confirm.
 */
export async function commitLocaleEdit(
    locale: string,
    path: string,
    text: string,
    /** The official text, or undefined when the locale has none (a term it added itself). */
    official: string | undefined,
    current: string | undefined,
): Promise<LocaleEditResult | undefined> {
    const reverting = official !== undefined && text === official;
    if (text === (current ?? official)) return undefined;
    try {
        if (reverting) await deleteLocaleEdit(locale, path);
        else await saveLocaleEdit(locale, path, text);
        return { kind: reverting ? 'reverted' : 'saved', text, at: Date.now() };
    } catch {
        return { kind: 'failed', text, at: Date.now() };
    }
}
