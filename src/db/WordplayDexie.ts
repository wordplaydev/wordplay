import {
    type SerializedProject,
    type SerializedProjectUnknownVersion,
} from '@db/projects/ProjectSchemas';
import type { SerializedGallery } from '@db/galleries/Gallery';
import type { Character } from '@db/characters/Character';
import type { HowToDocument } from '@db/howtos/HowToDatabase.svelte';
import type { SerializedChat } from '@db/chats/ChatDatabase.svelte';
import type { SyncDomain } from '@db/Domains';
import type { SerializedKit, SerializedKitVersion } from '@db/kits/Kit';
import Dexie, { type Observable, type Table, liveQuery } from 'dexie';

/**
 * IndexedDB schema version for the shared `wordplay` local store.
 *
 * Deliberately decoupled from ProjectSchemaLatestVersion: that constant
 * versions the project *document* shape (handled at deserialize time via
 * upgradeProject), whereas this number versions the local *table* structure.
 * Tying them together meant every project-document bump forced a no-op
 * IndexedDB upgrade. Bump this only when adding/changing tables, and never
 * reuse a value already shipped.
 *
 * v8 was the projects-only schema that shipped previously. v9 adds the
 * per-domain mirror tables for the local-first architecture (all in one
 * migration so users upgrade once rather than once per domain). v10 adds the
 * `dirty` table tracking items with edits not yet confirmed in the cloud, so
 * unsaved work survives a reload and gets replayed. v11 adds kits (#8) and
 * their versions.
 */
const WordplayDBVersion = 11;

/** A locally-cached item with edits not yet confirmed saved in the cloud.
 *  Keyed by `${domain}:${id}` so one table covers every domain. */
type DirtyRow = { key: string; domain: SyncDomain; id: string };

/** The IndexedDB cache mirroring the user's Firebase data, one table per
 *  domain. A single shared instance is owned by `Database`; do not construct
 *  more than one (multiple Dexie instances declaring different schemas for the
 *  same DB name conflict). */
export class WordplayDexie extends Dexie {
    projects!: Table<SerializedProject>;
    galleries!: Table<SerializedGallery>;
    characters!: Table<Character>;
    howtos!: Table<HowToDocument>;
    chats!: Table<SerializedChat>;
    kits!: Table<SerializedKit>;
    /**
     * Published kit versions, cached **permanently**.
     *
     * A version is immutable by construction, so there is nothing to invalidate and
     * nothing to listen for: once a device has read `amy/colors 3` it never reads it
     * again. That is what makes a class of thirty students sharing one kit cost thirty
     * reads ever rather than thirty per session.
     *
     * Indexed by `kit` so a kit's version history is one query.
     */
    kitversions!: Table<SerializedKitVersion>;
    dirty!: Table<DirtyRow>;

    constructor() {
        super('wordplay');
        // v8 (historical): the projects-only schema that shipped previously.
        // Kept verbatim — including the legacy `collabators` index spelling —
        // so existing users' IndexedDB upgrades cleanly to v9.
        this.version(8).stores({
            projects: '++id, name, locales, owner, collabators',
        });
        // v9: add the per-domain mirror tables. Primary keys only; hydration
        // reads whole tables, so no secondary indexes are needed yet. Chats are
        // keyed by their project/how-to id (the Firestore doc id), matching the
        // in-memory `chats` map.
        this.version(9).stores({
            projects: '++id, name, locales, owner, collabators',
            galleries: 'id',
            characters: 'id',
            howtos: 'id',
            chats: 'project',
        });
        // v10: add the `dirty` table (items with edits not yet confirmed in the
        // cloud) so unsaved work survives a reload. Indexed by domain for the
        // per-domain replay query.
        this.version(10).stores({
            projects: '++id, name, locales, owner, collabators',
            galleries: 'id',
            characters: 'id',
            howtos: 'id',
            chats: 'project',
            dirty: 'key, domain',
        });
        // v11: add kits and their versions (#8). Kits are indexed by `name` because a
        // borrow names a kit by `username/name` and has to resolve it locally before
        // asking the cloud; versions by `kit` so a version history is one query.
        this.version(WordplayDBVersion).stores({
            projects: '++id, name, locales, owner, collabators',
            galleries: 'id',
            characters: 'id',
            howtos: 'id',
            chats: 'project',
            kits: 'id, name, owner',
            kitversions: 'id, kit',
            dirty: 'key, domain',
        });
    }

    // --- Dirty tracking (items with edits not yet confirmed in the cloud) ---

    private dirtyKey(domain: SyncDomain, id: string): string {
        return `${domain}:${id}`;
    }

    /** Returns the Dexie promise so callers can await/catch a rejected write
     *  (e.g. QuotaExceededError when this device's storage is full). */
    markDirty(domain: SyncDomain, id: string): Promise<unknown> {
        return this.dirty.put({ key: this.dirtyKey(domain, id), domain, id });
    }

    async markClean(domain: SyncDomain, id: string): Promise<void> {
        return await this.dirty.delete(this.dirtyKey(domain, id));
    }

    async getDirty(domain: SyncDomain): Promise<string[]> {
        const rows = await this.dirty.where('domain').equals(domain).toArray();
        return rows.map((row) => row.id);
    }

    async clearDirty(domain: SyncDomain): Promise<void> {
        await this.dirty.where('domain').equals(domain).delete();
    }

    // --- Projects ---

    async getProject(
        id: string,
    ): Promise<SerializedProjectUnknownVersion | undefined> {
        const project = await this.projects.where('id').equals(id).toArray();
        return project[0];
    }

    async deleteAllProjects(): Promise<void> {
        return await this.projects.clear();
    }

    async deleteProject(id: string): Promise<void> {
        return await this.projects.delete(id);
    }

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveProjects(projects: SerializedProject[]): Promise<unknown> {
        return this.projects.bulkPut(projects);
    }

    async getAllProjects(): Promise<Observable<SerializedProject[]>> {
        return liveQuery(() => this.projects.toArray());
    }

    // --- Characters ---

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveCharacters(characters: Character[]): Promise<unknown> {
        return this.characters.bulkPut(characters);
    }

    async deleteCharacter(id: string): Promise<void> {
        return await this.characters.delete(id);
    }

    async deleteAllCharacters(): Promise<void> {
        return await this.characters.clear();
    }

    getAllCharacters(): Observable<Character[]> {
        return liveQuery(() => this.characters.toArray());
    }

    // --- Kits and their published versions (#8) ---

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveKit(kit: SerializedKit): Promise<unknown> {
        return this.kits.put(kit);
    }

    async deleteKit(id: string): Promise<void> {
        return await this.kits.delete(id);
    }

    async deleteAllKits(): Promise<void> {
        await this.kits.clear();
        await this.kitversions.clear();
    }

    /** Read once rather than as a live query: a kit changes only when its owner
     *  publishes, and the cloud listener is what reports that. */
    async getAllKits(): Promise<SerializedKit[]> {
        return await this.kits.toArray();
    }

    saveKitVersion(version: SerializedKitVersion): Promise<unknown> {
        return this.kitversions.put(version);
    }

    /** Every cached version. Never invalidated: a published version is immutable, so a
     *  cached one cannot be stale, which is what makes borrowing a kit free after the
     *  first read on a device. */
    async getAllKitVersions(): Promise<SerializedKitVersion[]> {
        return await this.kitversions.toArray();
    }

    // --- Chats (keyed by project/how-to id) ---

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveChats(chats: SerializedChat[]): Promise<unknown> {
        return this.chats.bulkPut(chats);
    }

    async deleteChat(projectID: string): Promise<void> {
        return await this.chats.delete(projectID);
    }

    async deleteAllChats(): Promise<void> {
        return await this.chats.clear();
    }

    getAllChats(): Observable<SerializedChat[]> {
        return liveQuery(() => this.chats.toArray());
    }

    // --- Galleries ---

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveGalleries(galleries: SerializedGallery[]): Promise<unknown> {
        return this.galleries.bulkPut(galleries);
    }

    async deleteGallery(id: string): Promise<void> {
        return await this.galleries.delete(id);
    }

    async deleteAllGalleries(): Promise<void> {
        return await this.galleries.clear();
    }

    getAllGalleries(): Observable<SerializedGallery[]> {
        return liveQuery(() => this.galleries.toArray());
    }

    // --- How-tos ---

    /** Returns the Dexie promise so callers can await/catch a rejected write. */
    saveHowTos(howtos: HowToDocument[]): Promise<unknown> {
        return this.howtos.bulkPut(howtos);
    }

    async deleteHowTo(id: string): Promise<void> {
        return await this.howtos.delete(id);
    }

    async deleteAllHowTos(): Promise<void> {
        return await this.howtos.clear();
    }

    getAllHowTos(): Observable<HowToDocument[]> {
        return liveQuery(() => this.howtos.toArray());
    }
}
