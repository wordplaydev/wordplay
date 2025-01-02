////////////////////////////////
// CACHE
////////////////////////////////

import { SvelteMap } from 'svelte/reactivity';
import { GlyphSchema, type Glyph, type GlyphShape } from '../glyphs/glyphs';
import { SaveStatus, type Database } from './Database';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    where,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';

const GlyphsCollection = 'glyphs';

export class GlyphDatabase {
    private readonly db: Database;

    /**
     * This is a global reactive map that stores chats obtained from Firestore.
     * It's our locale cache.
     * null = we know it's not there.
     */
    readonly glyphs = $state<Record<string, Glyph | null>>({});

    /** The realtime listener unsubscriber */
    private unsubscribe: Unsubscribe | undefined = undefined;

    /** The map of glyphs needing to be saved */
    private unsaved = new Map<string, Glyph>();

    /** The timeout we use to debounce saves */
    private saveTimeout: NodeJS.Timeout | undefined = undefined;

    constructor(db: Database) {
        this.db = db;
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user) this.listen(firestore, user);
    }

    private ignore() {
        if (this.unsubscribe) this.unsubscribe();
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, GlyphsCollection),
                where('owner', '==', user.uid),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const glyph = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        const parsed = GlyphSchema.parse(glyph);
                        // Update the chat in the local cache, but do not persist; we just got it from the DB.
                        this.updateGlyph(parsed, false);
                    } catch (error) {
                        // If the chat doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    // Stop litening to the project's changes.
                    if (change.type === 'removed') {
                        const glyphID = change.doc.id;
                        delete this.glyphs[glyphID];
                    }
                });
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }

    /** Create a glyph */
    async createGlyph(): Promise<string | undefined> {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user === null) return;

        // Make a new glyph.
        const glyph: Glyph = {
            id: uuidv4(),
            owner: user.uid,
            public: false,
            viewers: [],
            projects: [],
            updated: Date.now(),
            name: '',
            description: '',
            shapes: [],
        };

        try {
            await setDoc(doc(firestore, GlyphsCollection, glyph.id), glyph);
        } catch (err) {
            console.error(err);
            return;
        }

        // Cache locally.
        this.updateGlyph(glyph, false);

        // Return the id to confirm we created it.
        return glyph.id;
    }

    /** Update the local store's version of this glyph, and defer a save to the database later. */
    updateGlyph(glyph: Glyph, persist: boolean) {
        const existingGlyph = this.glyphs[glyph.id];

        // Are they equivalent? Don't bother. This prevents cycles.
        if (
            existingGlyph &&
            JSON.stringify(existingGlyph) === JSON.stringify(glyph)
        )
            return;

        if (
            existingGlyph === undefined ||
            existingGlyph === null ||
            glyph.updated > existingGlyph.updated
        )
            this.glyphs[glyph.id] = { ...glyph, updated: Date.now() };

        // Are we to persist? Defer a save.
        if (persist) {
            this.unsaved.set(glyph.id, glyph);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(
                () => this.persistUnsavedGlyphs(),
                1000,
            );
        }
    }

    async persistUnsavedGlyphs() {
        this.db.setStatus(SaveStatus.Saving, undefined);
        if (firestore === undefined) return;
        try {
            await Promise.all(
                this.unsaved
                    .values()
                    .map(
                        (glyph) =>
                            firestore &&
                            setDoc(
                                doc(firestore, GlyphsCollection, glyph.id),
                                glyph,
                            ),
                    ),
            );
            this.db.setStatus(SaveStatus.Saved, undefined);
        } catch (err) {
            this.db.setStatus(SaveStatus.Error, undefined);
            console.log(err);
        }
    }

    /**
     * Get the glyph by ID.
     * undefined: we are enable to check for it.
     * null: it doesn't exist in the database.
     * */
    async getGlyph(id: string): Promise<Glyph | null | undefined> {
        const localMatch = this.glyphs[id];
        // Doesn't exist? Say so.
        if (localMatch === null) return null;
        // Found a match locally? Return it. Rely on realtime to keep it up to date.
        if (localMatch !== undefined) return localMatch;
        // We have to check, but don't have database access? Undefined.
        if (firestore === undefined) return;

        try {
            const onlineMatch = await getDoc(
                doc(firestore, GlyphsCollection, id),
            );
            if (onlineMatch.exists()) {
                const glyph = onlineMatch.data();
                try {
                    const parsed: Glyph = GlyphSchema.parse(glyph);
                    this.updateGlyph(parsed, false);
                    return parsed;
                } catch (err) {
                    // Couldn't parse, so don't save it.
                    console.error(err);
                    return null;
                }
            } else {
                this.glyphs[id] = null;
                return null;
            }
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    /** Get all cached glyphs owned by the user */
    getOwnedGlyphs(): Glyph[] {
        return Array.from(Object.values(this.glyphs))
            .filter((glyph) => glyph !== null)
            .filter((glyph) => glyph.owner === this.db.getUser()?.uid);
    }
}
