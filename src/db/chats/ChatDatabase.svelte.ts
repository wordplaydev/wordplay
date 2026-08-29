/** This file encapsulates all Firebase chat functionality and relies on Svelte state to cache chat documents. */
import {
    HowTos,
    type Database,
    type SaveCounts,
    type SaveError,
} from '@db/Database';
import { Domain } from '@db/Domains';
import SaveTracker from '@db/SaveTracker.svelte';
import { firestore } from '@db/firebase';
import type Gallery from '@db/galleries/Gallery';
import HowTo from '@db/howtos/HowToDatabase.svelte';
import isQuotaError from '@db/isQuotaError';
import type Project from '@db/projects/Project';
import supportsIndexedDB from '@db/supportsIndexedDB';
import deferToIdle from '@util/deferToIdle';
import { FirebaseError } from 'firebase/app';
import type { Unsubscribe, User } from 'firebase/auth';
import {
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    setDoc,
    updateDoc,
    where,
    type Firestore,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import sendModerate from '@db/moderation/moderate';
import sendReport from '@db/moderation/report';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

////////////////////////////////
// SCHEMAS
////////////////////////////////

const MessageSchemaV1 = z.object({
    /** A UUID to help with identifying messages */
    id: z.string(),
    /** When the message was created */
    time: z.number(),
    /** The author of the message. */
    creator: z.string(),
    /** The text of the message, using Wordplay markup format */
    text: z.string().nullable(),
    /** The locale the writer says this message is in (a Wordplay locale
     *  string, e.g. "en-US"), for translating it into someone else's.
     *  Optional: messages written before this existed have none, and fall back
     *  to the chat's own language. Load-bearing for on-device translation,
     *  which requires an explicit source language and cannot infer one.
     *
     *  Declared here rather than only on v3 because a message can arrive
     *  carrying one *before* its chat has been migrated: rules, client, and
     *  functions deploy together while the migration is a separate step, so a
     *  document sits at v2 while new clients append v3-shaped messages to it.
     *  On v3 alone, the upgrader below would strip the tag on every read and
     *  translation could never find a source language — the same reasoning the
     *  `moderation` map carries. */
    language: z.string().exactOptional(),
});

/**
 * v2 put a message's moderation state on the message itself, along with who
 * reported it and who decided. Kept only so the upgrader can read those fields
 * off documents already in the field; nothing writes this shape any more.
 */
const MessageSchemaV2 = MessageSchemaV1.extend(
    z.object({
        moderation: z.enum(['pending', 'removed', 'approved']).exactOptional(),
        reporter: z.string().exactOptional(),
        moderator: z.string().exactOptional(),
    }).shape,
);

/**
 * v3 takes all three fields off again (#938).
 *
 * `reporter` was the serious one: a chat document is readable by every
 * participant, including the person whose message was reported, so naming the
 * reporter there made a request for review into a public accusation — the exact
 * thing the platform's own `reports` collection was built to avoid. Reports now
 * live there for chats too, and the decision state moved to a map on the chat
 * that only the server may write.
 *
 * `language` was added later, without a version of its own. An optional field
 * needs no upgrade — every document in the field is already v3 and parses
 * unchanged without it — and a bump would have been actively harmful: a tab
 * still running the previous deploy reaches `upgradeChat`'s `default` branch,
 * which throws, so the first chat a newer client touched would stop loading
 * there. How-tos gained `flags` the same way.
 */
const MessageSchemaV3 = MessageSchemaV1;

const MessageSchema = MessageSchemaV3;
export const MessageSchemaLatestVersion = 3;

export type SerializedMessage = z.infer<typeof MessageSchemaV3>;
export type SerializedMessageUnknownVersion =
    z.infer<typeof MessageSchemaV2> | SerializedMessage;

const ChatSchemaV1 = z.object({
    // The version of the schema
    v: z.literal(1),
    /** A UUID corresponding to the project or how-to ID to which this chat applies. Also the id for the chat in the collection. */
    project: z.string(),
    /**
     * A list of creator IDs who can contribute to this chat.
     * This is redundant with who has permission, but necessary to repeat
     * here for querying purposes. Yay NoSQL... */
    participants: z.array(z.string()),
    /** A list of chat messages. The pre-v3 shape, so `upgradeChat` can still
     *  read the moderation fields it lifts off them. */
    messages: z.array(MessageSchemaV2),
    /**
     * A list of creator IDs who have not seen a chat with an updated message. This is updated by clients
     * each time a message is added, so that other clients can check quickly check to see if any
     * chats they are in are new.
     */
    unread: z.array(z.string()),
});

/** v2 adds a type to let us know if the project field's UUID refers to a project or a how-to */
const ChatSchemaV2 = ChatSchemaV1.omit({ v: true }).extend(
    z.object({ v: z.literal(2), type: z.enum(['project', 'howto']) }).shape,
);

/**
 * v3 moves message moderation off the messages and onto the chat, as a map from
 * message id to state (#938).
 *
 * Here rather than on the message because the security rules have to be able to
 * refuse it: a rule can name a top-level key and say a participant may not
 * touch it, but cannot reach inside an array of messages to protect one field
 * of one element. With it on the message, any participant could set their own
 * reported message back to `approved`.
 */
const ChatSchemaV3 = ChatSchemaV2.omit({ v: true }).extend(
    z.object({
        v: z.literal(3),
        /** The messages, without the moderation fields v2 kept on them. */
        messages: z.array(MessageSchema),
        /** Message id to its moderation state. Server-written; see above. */
        moderation: z
            .record(z.string(), z.enum(['pending', 'removed', 'approved']))
            .default({}),
        /** The locale this conversation is mostly in, set when it starts. The
         *  source language for a message with no tag of its own — a better
         *  guess than the reader's own locale, which is what they're
         *  translating *into*. Optional, and unversioned, for the reason
         *  above. */
        language: z.string().exactOptional(),
    }).shape,
);

/** The latest version of the chat schema */
const ChatSchema = ChatSchemaV3;
const ChatSchemaLatestVersion = 3;

export type SerializedChat = z.infer<typeof ChatSchemaV3>;
export type SerializedChatUnknownVersion =
    | z.infer<typeof ChatSchemaV1>
    | z.infer<typeof ChatSchemaV2>
    | SerializedChat;

/** A pre-v3 chat's `moderation` map, if a callable has already written one.
 *  Each value is checked rather than trusted: this is reading a shape the
 *  version number says shouldn't be there yet. */
function moderationOf(
    chat: SerializedChatUnknownVersion,
): Record<string, 'pending' | 'removed' | 'approved'> {
    const states: Record<string, 'pending' | 'removed' | 'approved'> = {};
    if (!('moderation' in chat)) return states;
    const map: unknown = chat.moderation;
    if (typeof map !== 'object' || map === null || Array.isArray(map))
        return states;
    for (const [id, state] of Object.entries(map))
        if (state === 'pending' || state === 'removed' || state === 'approved')
            states[id] = state;
    return states;
}

/** Chat upgrader */
export function upgradeChat(
    chat: SerializedChatUnknownVersion,
): SerializedChat {
    switch (chat.v) {
        case 1:
            return upgradeChat({ ...chat, v: 2, type: 'project' });
        case 2:
            // Hoist each message's own moderation state into the chat's map and
            // drop `reporter`/`moderator` from the messages. The strip has to
            // happen here rather than being left to zod: the listener parses
            // for the throw and then uses this *unparsed* object, so a field
            // zod would have ignored would otherwise survive into memory — and
            // for `reporter`, survive into the next write of the document.
            //
            // Anything already in the chat's own `moderation` map wins. Rules,
            // client, and functions all deploy together, so between that deploy
            // and the migration a document sits at v2 while the callables write
            // the v3 map onto it — the Admin SDK writes one field, it doesn't
            // bump the version. Rebuilding the map from the messages alone
            // would throw that away, and a message someone had just reported
            // would read as deleted rather than as waiting for review.
            return upgradeChat({
                ...chat,
                v: 3,
                moderation: chat.messages.reduce<
                    Record<string, 'pending' | 'removed' | 'approved'>
                >(
                    (states, message) => {
                        const state = message.moderation;
                        if (
                            state !== undefined &&
                            states[message.id] === undefined
                        )
                            states[message.id] = state;
                        return states;
                    },
                    { ...moderationOf(chat) },
                ),
                // `language` comes along; only the moderation fields are
                // dropped. A new client appends a tagged message to a chat that
                // has not been migrated yet, so rebuilding without it would
                // strip the tag on every read.
                messages: chat.messages.map(
                    ({ id, time, creator, text, language }) => ({
                        id,
                        time,
                        creator,
                        text,
                        ...(language === undefined ? {} : { language }),
                    }),
                ),
            });
        case ChatSchemaLatestVersion:
            return chat;
        default:
            throw new Error('Unexpected chat version ' + chat);
    }
}

////////////////////////////////
// APIs
////////////////////////////////

// We let a chat's real message text be at most 128KB, which is a lot of
// text, but since we have to pass the whole document around each time, we
// need to cap it.
const MAX_CHAT_MESSAGES_BYTES = 131072;

/** How much of one language's translations of one conversation we keep.
 *
 *  Deliberately the same number as the conversation's own text budget: a
 *  translation is at most about as long again as its source, and the chat
 *  already refuses to hold more than that much message text. Even at four
 *  UTF-8 bytes per character — the worst any script does — that is 512KB
 *  against Firestore's hard 1MB per document, leaving room for a 36-byte UUID
 *  key on every entry. Counted in characters, the way the chat counts its
 *  own. */
const MAX_CHAT_TRANSLATION_CHARACTERS = MAX_CHAT_MESSAGES_BYTES;

/** An immutable wrapper class for accessing and manipulating chat data */
export default class Chat {
    /** The data of the chat. */
    private readonly data: SerializedChat;

    constructor(data: SerializedChat) {
        this.data = data;

        // We automatically trim the oldest chat messages if their text exceeds
        // the maximum size. We estimate about 2 bytes per codepoint, even
        // though some are 1 and some are 4.
        const textSize = data.messages.reduce(
            (size, message) => size + (message.text?.length ?? 0),
            0,
        );
        let messages = data.messages;
        if (textSize > MAX_CHAT_MESSAGES_BYTES) {
            let newSize = textSize;
            messages = [...messages];
            while (newSize > MAX_CHAT_MESSAGES_BYTES) {
                const message = messages.shift();
                if (message === undefined) break;
                newSize -= message.text?.length ?? 0;
            }
        }

        if (messages !== data.messages) this.data = { ...data, messages };
    }

    getProjectID() {
        return this.data.project;
    }

    /** Get all participants based on the chat data */
    getAllParticipants() {
        return [...new Set(this.data.messages.map((m) => m.creator))];
    }

    // Get the participants allowed to chat, derived from project permissions
    getEligibleParticipants() {
        return this.data.participants;
    }

    isEligible(creator: string) {
        return this.data.participants.includes(creator);
    }

    getMessages() {
        return this.data.messages;
    }

    /** Returns a new chat with the new message and updated unread status. */
    withMessage(message: SerializedMessage) {
        return new Chat({
            ...this.data,
            // Add the new message to the list.
            messages: [...this.data.messages, message],
            // All participants except the author should be marked as unread.
            unread: this.data.participants.filter((p) => p !== message.creator),
        });
    }

    /** Locally reflect that a message is awaiting review. The reporter is
     *  deliberately not recorded here: it belongs on the report, which only
     *  whoever is responsible can read. */
    withReportedMessage(message: SerializedMessage) {
        return new Chat({
            ...this.data,
            moderation: { ...this.data.moderation, [message.id]: 'pending' },
        });
    }

    /** Locally reflect a decision about a message. */
    withModeratedMessage(
        message: SerializedMessage,
        action: 'removed' | 'approved',
    ) {
        return new Chat({
            ...this.data,
            moderation: { ...this.data.moderation, [message.id]: action },
        });
    }

    /** Merges messages using time and text as unique identifier */
    withMergedMessages(messages: SerializedMessage[]) {
        // Create a map of messages by time and text.
        const messageMap = new Map<string, SerializedMessage>();
        for (const message of messages) {
            messageMap.set(message.id, message);
        }

        // Add the new messages to the map.
        for (const message of this.data.messages) {
            messageMap.set(message.id, message);
        }

        // Convert the map back to a list, sorted by time.
        const mergedMessages = Array.from(messageMap.values()).sort(
            (a, b) => a.time - b.time,
        );

        return new Chat({ ...this.data, messages: mergedMessages });
    }

    /** Keep the message, but replace it's text with nothing. */
    withoutMessage(message: SerializedMessage) {
        return new Chat({
            ...this.data,
            messages: this.data.messages.map((m) =>
                m.id === message.id ? { ...m, text: null } : m,
            ),
        });
    }

    getUnread() {
        return [...this.data.unread];
    }

    /** True if the unread list contains the given user ID */
    hasUnread(creator: string) {
        return this.data.unread.includes(creator);
    }

    /** What was decided about a message, if anything. Server-written: a
     *  participant who could set this would be deciding about their own
     *  reported message. */
    getMessageModeration(
        id: string,
    ): 'pending' | 'removed' | 'approved' | undefined {
        return this.data.moderation[id];
    }

    /** With the unread user unread */
    asRead(creator: string) {
        return new Chat({
            ...this.data,
            unread: this.data.unread.filter((u) => u !== creator),
        });
    }

    getType() {
        return this.data.type;
    }

    /** The primary locale string of this chat (e.g. "en-US"), or undefined for
     *  pre-existing chats created before this field existed. Used as the
     *  source-language fallback when translating messages with no per-message
     *  language tag. */
    getLanguage(): string | undefined {
        return this.data.language;
    }

    getData() {
        return { ...this.data };
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

const ChatsCollection = Domain.Chats;

/**
 * Cached translations of a chat's messages, one document per target language,
 * each a flat map from message id to translated text.
 *
 * A subcollection of the chat rather than a top-level collection keyed
 * `${chat}~${language}`, because everything that has to reason about these
 * documents needs the chat id, and a document id is the one place none of them
 * can get at it: the security rules can now read it from the path and repeat
 * the chat's own participant test, listing every language a chat has cached is
 * an ordinary collection read rather than a document-id range query, and the
 * server can enumerate them to evict a message the moderators took down.
 *
 * Not a `Domain`: a disposable cache, not mirrored to Dexie, not save-tracked,
 * not backed up. Losing it costs a re-translation and nothing else.
 */
const ChatTranslationsCollection = 'translations';

/** The translations subcollection of one chat. */
function chatTranslations(store: Firestore, chatID: string) {
    return collection(
        store,
        ChatsCollection,
        chatID,
        ChatTranslationsCollection,
    );
}

export class ChatDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores chats obtained from Firestore */
    readonly chats = $state(new SvelteMap<string, Chat>());

    /** Push-notification listeners keyed by projectID, fired from updateChat. */
    private readonly chatListeners = new Map<
        string,
        Set<(chat: Chat) => void>
    >();

    private unsubscribe: Unsubscribe | undefined = undefined;

    /** Cancels a pending idle-deferred `listen()` (see `listen`/`ignore`). */
    private listenDefer: (() => void) | undefined = undefined;

    private projectsListener: (project: Project) => void;
    private galleryListener: (gallery: Gallery) => void;
    private howToListener: (howto: HowTo) => void;

    /** Whether this is a browser with IndexedDB support. */
    readonly IndexedDBSupported = supportsIndexedDB();

    /** Flips true once `chats` has been populated from the local cache (or
     *  immediately, when there's no IndexedDB). */
    hydrated: boolean = $state(false);

    /** Per-item cloud-save tracking (unsaved set, errors, counts, durable dirty
     *  rows), shared with the other domain facades. See {@link SaveTracker}. */
    private readonly saves = new SaveTracker({
        domain: Domain.Chats,
        localDB: () => this.db.localDB,
        track: (write) => this.db.track(write),
        deviceCount: () => this.chats.size,
        supported: () => this.IndexedDBSupported,
        isHydrated: () => this.hydrated,
        onStorageFull: () =>
            this.db.reportBanner((l) => l.ui.banner.storageFull),
    });

    /** Project/how-to ids of conversations whose latest local change hasn't been
     *  confirmed saved in the cloud (write pending or failed). */
    get unsavedIDs() {
        return this.saves.unsavedIDs;
    }

    /** Save failures for the save-status dialog. */
    get saveErrors(): SaveError[] {
        return this.saves.saveErrors;
    }

    /** How many conversations are saved on this device, in the cloud, and
     *  unsaved. */
    get saveCounts(): SaveCounts {
        return this.saves.saveCounts;
    }

    constructor(db: Database) {
        this.db = db;
        this.projectsListener = this.handleRevisedProject.bind(this);
        this.galleryListener = this.handleRevisedGallery.bind(this);
        this.howToListener = this.handleRevisedHowTo.bind(this);

        // Warm `chats` from the local cache before any cloud sync.
        this.hydrate();
    }

    /** Populate `chats` from the shared local cache, then keep it in sync with
     *  local writes (including cross-tab). The first emission flips `hydrated`. */
    async hydrate() {
        if (!this.IndexedDBSupported) {
            this.hydrated = true;
            return;
        }
        // Seed the in-memory unsaved set from the durable dirty table so a
        // message sent offline before a reload is replayed by flushUnsaved.
        await this.saves.seedDirty();
        let firstEmission = true;
        this.db.localDB.getAllChats().subscribe((chats) => {
            for (const chat of chats) this.loadChatIntoMemory(chat);
            if (firstEmission) {
                firstEmission = false;
                this.hydrated = true;
            }
        });
    }

    /** Merge a cached chat into the in-memory map without persisting, writing
     *  back to the cache, or registering the project/gallery listeners that
     *  `updateChat` would. Kept Dexie-write-free so the hydrate subscription
     *  can't loop. */
    private loadChatIntoMemory(serialized: SerializedChat) {
        const projectID = serialized.project;
        const existingMessages = this.chats.get(projectID)?.getMessages() ?? [];
        this.chats.set(
            projectID,
            new Chat(serialized).withMergedMessages(existingMessages),
        );
    }

    /** Mirror authoritative chats into the local cache for cold-start
     *  hydration. Caches the MERGED in-memory chat (not the raw doc) so local
     *  optimistic messages survive. Never called from the hydrate path. */
    private async cacheChatsLocally(projectIDs: string[]) {
        if (!this.IndexedDBSupported || projectIDs.length === 0) return;
        const data: SerializedChat[] = [];
        for (const projectID of projectIDs) {
            const chat = this.chats.get(projectID);
            if (chat) data.push(chat.getData());
        }
        try {
            // Await so a rejected write (e.g. full storage) is caught; this
            // mirrors cloud data, so surface a transient banner, not data loss.
            await this.db.localDB.saveChats(data);
        } catch (error) {
            if (isQuotaError(error))
                this.db.reportBanner((l) => l.ui.banner.storageFull, error);
            else console.error(error);
        }
    }

    /** Clear the local chat cache and in-memory map. Used on account-switch and
     *  explicit sign-out, mirroring Projects' local wipe. */
    async clearLocal() {
        this.chats.clear();
        await this.saves.clearTracking();
        if (this.IndexedDBSupported) await this.db.localDB.deleteAllChats();
    }

    /**
     * Subscribe to updates for a specific chat. Returns an unsubscribe function.
     * This is a callback-based subscription that avoids going through Svelte's
     * reactive graph, preventing the closure-pinning issue described in ProjectView.
     */
    onChatUpdated(
        projectID: string,
        callback: (chat: Chat) => void,
    ): () => void {
        let listeners = this.chatListeners.get(projectID);
        if (listeners === undefined) {
            listeners = new Set();
            this.chatListeners.set(projectID, listeners);
        }
        listeners.add(callback);
        return () => this.chatListeners.get(projectID)?.delete(callback);
    }

    /**
     * Update the chat's state locally and optionally write the entire document
     * remotely. Full-doc writes are vulnerable to lost updates when multiple
     * participants act concurrently — prefer the granular methods below
     * (addMessage, markChatRead, reportMessage, moderateMessage, deleteMessage,
     * setChatParticipants) for any operation that races with other writers.
     * Persisting here is reserved for hydration and bootstrap paths.
     */
    async updateChat(chat: Chat, persist: boolean) {
        const projectID = chat.getProjectID();

        // Get the existing chat, if it exists, so we can merge it's existing texts.
        const existingMessages = this.chats.get(projectID)?.getMessages() ?? [];
        chat = chat.withMergedMessages(existingMessages);

        // Set the revised chat for the project in the local state, propogating updates.
        this.chats.set(projectID, chat);

        // Notify any push-subscribers for this project.
        this.chatListeners.get(projectID)?.forEach((cb) => cb(chat));

        // Make sure we're listening to updates on the chat's project.
        if (chat.getType() === 'project') {
            this.db.MaybeProjects?.listen(projectID, this.projectsListener);
        } else {
            this.db.HowTos.addListener(projectID, this.howToListener);
        }

        // Make sure we're listening to the gallery of the project.
        this.db.Galleries.listen(projectID, this.galleryListener);

        // If asked to persist, mirror to the local cache and update remotely.
        if (persist && firestore) {
            this.cacheChatsLocally([projectID]);
            await this.trackSave(
                projectID,
                updateDoc(
                    doc(firestore, ChatsCollection, chat.getProjectID()),
                    chat.getData(),
                ),
            );
        }
    }

    /** Wrap a cloud write so the save-status dialog reflects it; see
     *  {@link SaveTracker.trackSave}. Conversations have no title, so failures
     *  surface with a generic name in the dialog (no `name`). */
    private trackSave(id: string, write: Promise<unknown>): Promise<boolean> {
        return this.saves.trackSave(id, undefined, write);
    }

    /** Re-attempt the cloud write for every conversation still marked unsaved
     *  (e.g. a message sent offline before a reload). Called once the user is
     *  known (startSync) and on reconnect. No-op when nothing is unsaved. */
    async flushUnsaved() {
        if (firestore === undefined) return;
        const db = firestore;
        await this.saves.flushUnsaved((id) => {
            const chat = this.chats.get(id);
            // setDoc (not updateDoc): a chat created offline may never have
            // reached the server, so updateDoc would fail forever with
            // not-found. getData() is the full SerializedChat and `this.chats`
            // already holds the locally-merged messages, so this pushes the same
            // merged view updateDoc would — just create-capable.
            return chat
                ? {
                      write: setDoc(
                          doc(db, ChatsCollection, id),
                          chat.getData(),
                      ),
                  }
                : undefined;
        });
    }

    /**
     * Atomically append a message to a chat and refresh the unread list.
     * arrayUnion on `messages` lets concurrent senders accumulate rather than
     * overwrite each other; `unread` is computed from the chat's known
     * participants and will be re-corrected by the next syncParticipants pass
     * if the list was briefly stale.
     */
    private async writeAtomicChat(
        chatID: string,
        updates: Record<string, unknown>,
    ) {
        if (firestore === undefined) return;
        await this.trackSave(
            chatID,
            updateDoc(doc(firestore, ChatsCollection, chatID), updates),
        );
    }

    /**
     * Atomically replace a specific message in the messages array, using a
     * transaction so concurrent message additions aren't clobbered. The
     * `transform` returns the new message body to substitute for the matching
     * message id; if no message matches, the transaction is a no-op.
     */
    private async modifyChatMessage(
        chatID: string,
        messageID: string,
        transform: (m: SerializedMessage) => SerializedMessage,
    ) {
        if (firestore === undefined) return;
        const chatRef = doc(firestore, ChatsCollection, chatID);
        await this.trackSave(
            chatID,
            runTransaction(firestore, async (tx) => {
                const snap = await tx.get(chatRef);
                if (!snap.exists()) return;
                const current = upgradeChat(
                    snap.data() as SerializedChatUnknownVersion,
                );
                const messages = current.messages.map((m) =>
                    m.id === messageID ? transform(m) : m,
                );
                tx.update(chatRef, { messages });
            }),
        );
    }

    /** Atomically remove a UID from the unread list. */
    async markChatRead(chat: Chat, uid: string) {
        // Optimistic local update.
        this.chats.set(chat.getProjectID(), chat.asRead(uid));
        await this.writeAtomicChat(chat.getProjectID(), {
            unread: arrayRemove(uid),
        });
    }

    /**
     * Atomically replace the chat's participants list. Used by the participant
     * sync paths; only writes the participants field so messages/unread are
     * unaffected.
     */
    async setChatParticipants(chat: Chat, participants: string[]) {
        const updated = new Chat({ ...chat.getData(), participants });
        this.chats.set(chat.getProjectID(), updated);
        await this.writeAtomicChat(chat.getProjectID(), { participants });
    }

    /**
     * Ask whoever is responsible to review a message.
     *
     * Through the callable, not a write from here: the report has to name its
     * reviewers (which a participant can't be trusted to do), it has to be
     * deduplicated by a deterministic id, and it moves the message's text out
     * of the chat so that "temporarily removed" is actually true rather than a
     * client-side `{#if}` over text everyone can still read.
     */
    async reportMessage(chat: Chat, message: SerializedMessage) {
        // Optimistic, so the message hides immediately; the listener confirms.
        this.chats.set(chat.getProjectID(), chat.withReportedMessage(message));
        await sendReport({
            kind: 'chat',
            subject: chat.getProjectID(),
            message: message.id,
        });
    }

    /**
     * Record a decision about a message.
     *
     * Through the callable for the same reasons, plus one of its own: keeping a
     * message means putting its text back, and only whatever moved the text out
     * can put it back.
     */
    async moderateMessage(
        chat: Chat,
        message: SerializedMessage,
        action: 'removed' | 'approved',
        flags: Record<string, boolean | null>,
        note?: string,
    ) {
        this.chats.set(
            chat.getProjectID(),
            chat.withModeratedMessage(message, action),
        );
        await sendModerate({
            kind: 'chat',
            subject: chat.getProjectID(),
            message: message.id,
            flags,
            ...(note === undefined ? {} : { note }),
            strike: false,
            decision: `chat-${chat.getProjectID()}-${message.id}-${action}`,
        });
    }

    /** Clear a message's text (soft delete that preserves the message slot). */
    async deleteMessage(chat: Chat, message: SerializedMessage) {
        this.chats.set(chat.getProjectID(), chat.withoutMessage(message));
        await this.modifyChatMessage(chat.getProjectID(), message.id, (m) => ({
            ...m,
            text: null,
        }));
        // The text is gone from the chat, but a cached translation of it is a
        // separate document and would outlive it. Moderator takedowns are
        // evicted server-side, where the decision is made; this is the one
        // path a creator drives themselves.
        await this.deleteMessageTranslations(chat.getProjectID(), message.id);
    }

    /** Remove one message's cached translation from every language a chat has
     *  cached. Best-effort: these are disposable caches, so a failure is logged
     *  rather than surfaced to someone who was only deleting a message. */
    private async deleteMessageTranslations(chatID: string, messageID: string) {
        if (firestore === undefined) return;
        try {
            const languages = await getDocs(
                chatTranslations(firestore, chatID),
            );
            await Promise.all(
                languages.docs.map((language) =>
                    updateDoc(language.ref, { [messageID]: deleteField() }),
                ),
            );
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Cache translations of some messages, so the next person asking for this
     * language pays nothing.
     *
     * One blind merge write and no read. `known` is what the caller's live
     * subscription last delivered, so re-reading the document here would be a
     * second round trip for an answer the client already holds — and a racy
     * one, since another viewer's merge can land in between and have its fresh
     * entry deleted as stale.
     *
     * Concurrent viewers translating the same language still collide, which is
     * fine: merge is per-field, and the worst a lost race costs is one
     * re-translation, which is what a cache is for.
     */
    async saveMessageTranslations(
        chat: Chat,
        language: string,
        translations: Map<string, string>,
        known: Record<string, string>,
    ) {
        if (translations.size === 0 || firestore === undefined) return;

        const merged = new Map(Object.entries(known));
        for (const [id, text] of translations) merged.set(id, text);

        // Newest first until the budget runs out, matching the chat trimming
        // its own oldest messages, so what is cached stays a subset of what is
        // still readable.
        const keep = new Set<string>();
        let size = 0;
        for (const message of [...chat.getMessages()].reverse()) {
            const text = merged.get(message.id);
            if (text === undefined) continue;
            size += message.id.length + text.length;
            if (size > MAX_CHAT_TRANSLATION_CHARACTERS) break;
            keep.add(message.id);
        }

        const update: Record<string, string | ReturnType<typeof deleteField>> =
            {};
        for (const [id, text] of translations)
            if (keep.has(id)) update[id] = text;
        // Anything cached for a message the chat no longer keeps — trimmed, or
        // past the budget — goes, so this document cannot outgrow the
        // conversation it is about.
        for (const id of Object.keys(known))
            if (!keep.has(id)) update[id] = deleteField();

        if (Object.keys(update).length === 0) return;

        // setDoc rather than updateDoc: setDoc's keys are field *names*, where
        // updateDoc's are dotted field *paths*. Message ids are UUIDs so either
        // works, but only one of them says so.
        await setDoc(
            doc(chatTranslations(firestore, chat.getProjectID()), language),
            update,
            { merge: true },
        );
    }

    /** Watch one language's translations for a chat. The callback gets the
     *  whole map on subscribe and again whenever any viewer adds more. */
    subscribeChatTranslations(
        chatID: string,
        language: string,
        callback: (entries: Record<string, string>) => void,
    ): () => void {
        if (firestore === undefined) return () => {};
        return onSnapshot(
            doc(chatTranslations(firestore, chatID), language),
            (snap) => {
                const data = snap.data();
                const entries: Record<string, string> = {};
                // Read defensively rather than asserted: every writer is a
                // participant, so a value here is only as trustworthy as
                // whoever last translated this conversation.
                if (data !== undefined)
                    for (const [id, text] of Object.entries(data))
                        if (typeof text === 'string') entries[id] = text;
                callback(entries);
            },
            // Without this, being removed from the conversation looks exactly
            // like having no translations yet.
            (error) => console.error(error),
        );
    }

    /** Drop a chat from in-memory state and clear its save tracking + durable
     *  dirty row.  Does NOT delete the Firestore doc, the translation sidecar,
     *  or the cached row — callers handle those (the cloud listener owns cache
     *  eviction).  Shared by the explicit delete and the listener's "removed"
     *  handler. */
    private forgetChat(projectID: string) {
        this.chats.delete(projectID);
        this.saves.forget(projectID);
    }

    async deleteChat(projectID: string) {
        // Confirm-then-remove: delete the cloud doc FIRST and only forget local
        // state (memory + durable dirty row) once it lands. Forgetting first —
        // as this used to — meant a failed/offline delete cleared the dirty row
        // while the cloud copy survived, with nothing left to retry. write()
        // fails fast instead of hanging.
        if (firestore) {
            try {
                await this.db.write(
                    deleteDoc(doc(firestore, ChatsCollection, projectID)),
                );
            } catch (err) {
                this.db.reportBanner((l) => l.ui.banner.deleteFailed, err);
                return;
            }
        }
        // Nothing to do about the translations subcollection here. Firestore
        // never cascades a delete into one, and its rule reads the parent chat
        // to decide who may touch it — so once the chat is gone no client can
        // reach it at all. Deleting it first would fix only this path and
        // silently leak from every other way a chat dies (a project deleted, an
        // account closed), so the `chatDeleted` trigger owns it instead.
        this.forgetChat(projectID);
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        // Tear the listener down on logout — otherwise it keeps running after
        // auth clears and errors with permission-denied.
        if (user) this.listen(firestore, user);
        else this.ignore();
    }

    private getAllParticipants(
        project: Project,
        gallery: Gallery | undefined,
    ): Set<string> {
        return new Set([
            ...(gallery ? gallery.getCurators() : []),
            ...project.getContributors(),
            ...project.getCommenters(),
        ]);
    }

    /** Write a freshly-built chat to the cloud and mirror it locally, relying on
     *  the realtime listener for the rest. `link` runs inside the same try to
     *  attach the new chat to its parent project/how-to. Returns the chat id, or
     *  undefined if the write failed (logged). Shared by the project and how-to
     *  chat creators, which differ only in how they link the parent. */
    private async createChat(
        newChat: SerializedChat,
        link: () => void,
    ): Promise<string | undefined> {
        if (firestore === undefined) return undefined;
        try {
            // Create the document, tracking its save state.
            await this.trackSave(
                newChat.project,
                setDoc(
                    doc(firestore, ChatsCollection, newChat.project),
                    newChat,
                ),
            );
            // Mirror the chat in the cache, but not remotely; we just created it.
            this.updateChat(new Chat(newChat), false);
            // Attach it to its parent now that it's in the database.
            link();
            return newChat.project;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    /** Create a chat, if the project is owned and doesn't already have one. */
    async addChat(
        project: Project,
        gallery: Gallery | undefined,
        language: string,
    ): Promise<string | undefined> {
        if (firestore === undefined) return undefined;
        if (project.getOwner() === null) return undefined;

        const newChat: SerializedChat = {
            v: 3,
            project: project.getID(),
            messages: [],
            moderation: {},
            // Everyone contributing is eligible to see and participate in the chat.
            participants: Array.from(this.getAllParticipants(project, gallery)),
            unread: [],
            type: 'project',
            language,
        };

        return this.createChat(newChat, async () =>
            (await this.db.loadProjects()).reviseProject(
                project.withChat(newChat.project),
            ),
        );
    }

    async addChatToHowTo(
        howTo: HowTo,
        gallery: Gallery | undefined,
        language: string,
    ) {
        if (firestore === undefined) return undefined;
        if (howTo.getCreator() === null) return undefined;

        const newChat: SerializedChat = {
            v: 3,
            project: howTo.getHowToId(),
            messages: [],
            moderation: {},
            // All gallery curators, creators, viewers can access the chat
            // As can any creators or collaborators on a how-to
            participants: Array.from(
                new Set([
                    ...howTo.getCollaborators(),
                    ...howTo.getViewers(),
                    howTo.getCreator(),
                    ...(gallery ? gallery.getCurators() : []),
                    ...(gallery ? gallery.getCreators() : []),
                ]),
            ),
            unread: [],
            type: 'howto',
            language,
        };

        return this.createChat(newChat, () =>
            HowTos.updateHowTo(
                new HowTo({
                    ...howTo.getData(),
                    social: { ...howTo.getSocial(), chat: newChat.project },
                }),
                true,
            ),
        );
    }

    /** Should be called when a project updates, to synchronize chat participants. */
    async handleRevisedProject(project: Project) {
        // Find the gallery of this project, if there is one.
        const galleryID = project.getGallery();
        const gallery =
            galleryID === null
                ? undefined
                : await this.db.Galleries.get(galleryID);

        // Ensure the chat has the correct eligible participants based on the project and gallery.
        this.syncParticipants(project, gallery);
    }

    /** Should be called when a gallery updates, to synchronize chat participants */
    async handleRevisedGallery(gallery: Gallery) {
        // Synchronize the participants of all the projects in the gallery if this person is a curator of the gallery.
        // The user doesn't have permissions otherwise.
        const uid = this.db.getUser()?.uid;
        if (uid !== undefined && gallery.getCurators().includes(uid)) {
            for (const projectID of gallery.getProjects()) {
                const project = await (
                    await this.db.loadProjects()
                ).get(projectID);
                if (project) this.syncParticipants(project, gallery);
            }
        }
    }

    /** Should be called when a how-to updates, to synchronize chat participants */
    async handleRevisedHowTo(howTo: HowTo) {
        // ensure that the chat has the correct eligible participants based on the how-to

        this.syncParticipantsHowTo(howTo);
    }

    /** Ensure the participants of the chat include the project owner, project collaborators, and if in a gallery, curators of the gallery it is in. */
    syncParticipants(project: Project, gallery: Gallery | undefined) {
        // Ensure the chat has all of the project's contributors.
        const chat = this.chats.get(project.getID());

        // No corresponding chat? That's an issue: the only projects we should be listening to are the ones
        // with chats!
        if (chat === undefined) {
            console.error(
                `No chat found for project ${project.getID()}, but we're listening to its changes for some reason. Perhaps a defect?`,
            );
            return;
        }

        // Get the chat's sorted lists of participants as a string, so we can quickly check the current set.
        const currentChatParticipantsString = chat
            .getEligibleParticipants()
            .sort()
            .join();

        // Get the chat's intended participants based on the project and gallery.
        const intendedChatParticipants = [
            ...this.getAllParticipants(project, gallery),
        ].sort();

        // If they're not updated, update them.
        if (currentChatParticipantsString !== intendedChatParticipants.join()) {
            this.setChatParticipants(chat, intendedChatParticipants);
        }
    }

    async syncParticipantsHowTo(howTo: HowTo) {
        // Ensure the chat has all of the project's contributors.
        const chat = this.chats.get(howTo.getHowToId());
        const galleryID = howTo.getHowToGalleryId();
        const gallery =
            galleryID === null
                ? undefined
                : await this.db.Galleries.get(galleryID);

        // No corresponding chat? That's an issue: the only projects we should be listening to are the ones
        // with chats!
        if (chat === undefined) {
            console.error(
                `No chat found for project ${howTo.getHowToId()}, but we're listening to its changes for some reason. Perhaps a defect?`,
            );
            return;
        }

        // Get the chat's sorted lists of participants as a string, so we can quickly check the current set.
        const currentChatParticipantsString = chat
            .getEligibleParticipants()
            .sort()
            .join();

        // Get the chat's intended participants based on the project and gallery.
        const intendedChatParticipants = [
            ...new Set([
                ...howTo.getCollaborators(),
                ...howTo.getViewers(),
                howTo.getCreator(),
                ...(gallery ? gallery.getCurators() : []),
                ...(gallery ? gallery.getCreators() : []),
            ]),
        ].sort();

        // If they're not updated, update them.
        if (currentChatParticipantsString !== intendedChatParticipants.join()) {
            this.setChatParticipants(chat, intendedChatParticipants);
        }
    }

    /** Get the chat for this project. Undefined if there isn't one, false if we couldn't due to an error. */
    async getChat(project: Project): Promise<Chat | undefined | false> {
        const chatID = project.getID();
        if (chatID === null) return undefined;

        return this.getChatHelper(chatID);
    }

    /** Get the chat for this how-to. Undefined if there isn't one, false if we couldn't due to an error */
    async getChatHowTo(howTo: HowTo): Promise<Chat | undefined | false> {
        const chatID = howTo.getHowToId();
        if (chatID === null) return undefined;

        return this.getChatHelper(chatID);
    }

    private async getChatHelper(
        chatID: string,
    ): Promise<Chat | undefined | false> {
        // Do we have the chat cached? Return it.
        const chat = this.chats.get(chatID);
        if (chat) return chat;

        // If not, see if it's in the database.
        if (firestore === undefined) return undefined;
        try {
            const chatDoc = await this.db.read(
                getDoc(doc(firestore, ChatsCollection, chatID)),
            );
            if (chatDoc.exists()) {
                const remoteChat = chatDoc.data();
                if (remoteChat === undefined) return undefined;

                // assume that the chat is of an unknown version and upgrade it
                const newChat = new Chat(
                    upgradeChat(
                        remoteChat as SerializedChatUnknownVersion,
                    ) as SerializedChat,
                );
                // Update the chat locally, but do not persist, we already know it's in the database..
                this.updateChat(newChat, false);
                return newChat;
            } else return undefined;
        } catch (err) {
            // A connectivity failure (offline / unreachable backend) must not
            // block starting a chat: treat it like "no chat yet" so the start
            // button shows and a chat created offline is queued locally and
            // replayed on reconnect (the offline-create path). Without this the
            // panel shows the "couldn't load" error tile instead — and which
            // branch we hit was browser-dependent (Firestore's offline getDoc
            // resolves-as-nonexistent on some engines but rejects on WebKit).
            // Only a genuine error (e.g. permission-denied) returns false.
            if (this.db.isConnectivityError(err)) return undefined;
            return false;
        }
    }

    async addMessage(
        chat: Chat,
        message: string,
        language: string | undefined,
    ): Promise<SerializedMessage | undefined> {
        const user = this.db.getUser()?.uid;
        if (user === undefined) return;
        if (firestore === undefined) return;
        const newMessage: SerializedMessage = {
            id: uuidv4(),
            text: message,
            time: Date.now(),
            creator: user,
            // Only tag a language when the creator chose one; existing messages
            // and untagged sends leave the optional field unset.
            ...(language !== undefined ? { language } : {}),
        };

        // Optimistic local update so the sender sees their message immediately.
        this.chats.set(chat.getProjectID(), chat.withMessage(newMessage));

        // Atomic field operations on the server: arrayUnion lets concurrent
        // senders accumulate messages, and unread is recomputed from the
        // currently-known participants minus the sender. If the participants
        // list shifts concurrently with the message add, the next sync pass
        // will re-derive unread correctly.
        this.writeAtomicChat(chat.getProjectID(), {
            messages: arrayUnion(newMessage),
            unread: chat.getEligibleParticipants().filter((p) => p !== user),
        });

        return newMessage;
    }

    ignore() {
        if (this.listenDefer) {
            this.listenDefer();
            this.listenDefer = undefined;
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();

        // Defer this background listener until the browser is idle so it doesn't
        // compete with the critical galleries/projects load on login.
        this.listenDefer = deferToIdle(() => {
            this.listenDefer = undefined;
            // The user may have signed out or switched during the idle gap.
            if (this.db.getUser()?.uid !== user.uid) return;
            this.startListening(firestore, user);
        });
    }

    private startListening(firestore: Firestore, user: User) {
        this.db.markSyncing(Domain.Chats);

        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, ChatsCollection),
                where('participants', 'array-contains', user.uid),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                const synced: string[] = [];
                snapshot.forEach((doc) => {
                    const chat = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        const upgraded = upgradeChat(
                            chat as SerializedChatUnknownVersion,
                        );
                        ChatSchema.parse(upgraded);
                        // Update the chat in the local cache, but do not persist; we just got it from the DB.
                        // assume it's a chat of unknown version and upgrade it
                        this.updateChat(new Chat(upgraded), false);
                        synced.push(upgraded.project);
                    } catch (error) {
                        // If the chat doesn't succeed, then we don't save it.
                        console.error(error);
                    }
                });

                // Mirror the cloud truth into the local cache for next cold start.
                this.cacheChatsLocally(synced);

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach(async (change) => {
                    // Removed? Delete the local cache of the project.
                    // Stop listening to the project's changes.
                    if (change.type === 'removed') {
                        const projectID = change.doc.id;
                        this.forgetChat(projectID);
                        // Evict the cached row too — the listener owns cache
                        // eviction (the explicit delete leaves it to us).
                        if (this.IndexedDBSupported)
                            void this.db.localDB.deleteChat(projectID);
                        if (
                            change.doc.data().type === 'project' &&
                            this.projectsListener
                        )
                            this.db.MaybeProjects?.ignore(
                                projectID,
                                this.projectsListener,
                            );
                        else if (
                            change.doc.data().type === 'howto' &&
                            this.howToListener
                        )
                            this.db.HowTos.ignoreListener(
                                projectID,
                                this.howToListener,
                            );
                    }
                    // An unread conversation used to be pushed to the bell from
                    // here, gated on the message arriving after the page opened
                    // — so a message that landed while the tab was closed was
                    // never mentioned, and one that was mentioned vanished on
                    // reload. The bell now derives it from `unread` on the chat
                    // itself, which is durable and already synced.
                });

                this.db.markSynced(Domain.Chats, this.chats.size);
            },
            (error) => {
                // Always terminal so the save-status button stops spinning and
                // the dialog shows "failed" (incl. permission/index errors);
                // only connectivity errors flip the offline/unreachable state.
                this.db.markSyncFailed(Domain.Chats);
                if (this.db.isConnectivityError(error))
                    this.db.markFirebaseFailed();
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }
}
