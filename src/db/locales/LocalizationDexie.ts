import Dexie, { type Table } from 'dexie';
import { writable } from 'svelte/store';

interface LocaleEdit {
    /** Serialized LocalePath string, e.g. "ui.localize.button.edit" */
    path: string;
    value: string;
}

class LocalizationDexie extends Dexie {
    edits!: Table<LocaleEdit>;

    constructor() {
        super('wordplay-localization');
        this.version(1).stores({ edits: 'path' });
    }
}

const db = new LocalizationDexie();

/** Reactive store mirroring all locally-saved locale edits, keyed by serialized LocalePath. */
export const localeEdits = writable<Map<string, string>>(new Map());

// Populate the store from IndexedDB on load.
db.edits.toArray().then((all) => {
    localeEdits.set(new Map(all.map((e) => [e.path, e.value])));
});

export async function deleteAllLocaleEdits(): Promise<void> {
    localeEdits.set(new Map());
    await db.edits.clear();
}

export async function deleteLocaleEdit(path: string): Promise<void> {
    localeEdits.update((map) => {
        const next = new Map(map);
        next.delete(path);
        return next;
    });
    await db.edits.delete(path);
}

export async function saveLocaleEdit(path: string, value: string): Promise<void> {
    // Update the store immediately so the UI reacts without waiting for Dexie.
    localeEdits.update((map) => {
        const next = new Map(map);
        next.set(path, value);
        return next;
    });
    await db.edits.put({ path, value });
}
