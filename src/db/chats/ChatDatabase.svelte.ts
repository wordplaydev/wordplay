/** This file encapsulates all Firebase chat functionality and relies on Svelte state to cache chat documents. */
import type { NotificationData } from '@components/settings/Notifications.svelte';
import {
    HowTos,
    Projects,
    type Database,
    type SaveCounts,
    type SaveError,
} from '@db/Database';
import { Domain } from '@db/Domains';
import SaveTracker from '@db/SaveTracker.svelte';
import { firestore } from '@db/firebase';
import type Gallery from '@db/galleries/Gallery';
import HowTo from '@db/howtos/HowToDatabase.svelte';
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
    doc,
    getDoc,
    onSnapshot,
    query,
    runTransaction,
    setDoc,
    updateDoc,
    where,
    type Firestore,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { notifications } from '../../routes/+layout.svelte';

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
});

const MessageSchemaV2 = MessageSchemaV1.extend(
    z.object({
        /** The moderation status of this message:
         * undefined (not reported),
         * pending moderation action,
         * removed due to moderation action,
         * approved after review */
        moderation: z.enum(['pending', 'removed', 'approved']).optional(),
        /** The user who reported the message */
        reporter: z.string().optional(),
        /** The user who took moderation action */
        moderator: z.string().optional(),
    }).shape,
);

const MessageSchema = MessageSchemaV2;
export const MessageSchemaLatestVersion = 2;

export type SerializedMessage = z.infer<typeof MessageSchemaV2>;
export type SerializedMessageUnknownVersion =
    | z.infer<typeof MessageSchemaV1>
    | SerializedMessage;

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
    /** A list of chat messages */
    messages: z.array(MessageSchema),
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

/** The latest version of the chat schema */
const ChatSchema = ChatSchemaV2;
const ChatSchemaLatestVersion = 2;

export type SerializedChat = z.infer<typeof ChatSchemaV2>;
export type SerializedChatUnknownVersion =
    | z.infer<typeof ChatSchemaV1>
    | SerializedChat;

/** Chat upgrader */
export function upgradeChat(
    chat: SerializedChatUnknownVersion,
): SerializedChat {
    switch (chat.v) {
        case 1:
            return upgradeChat({ ...chat, v: 2, type: 'project' });
        case ChatSchemaLatestVersion:
            return chat;
        default:
            throw new Error('Unexpected chat version ' + chat);
    }
}

////////////////////////////////
// APIs
////////////////////////////////

// We let a chat be at most 128KB, which is a lot of text, but since we have to pass the
// whole document around each time, we need to cap it.
const MAX_CHAT_MESSAGES_BYTES = 131072;

/** An immutable wrapper class for accessing and manipulating chat data */
export default class Chat {
    /** The data of the chat. */
    private readonly data: SerializedChat;

    constructor(data: SerializedChat) {
        this.data = data;

        // We automatically trim the chat messages if they exceed the maximum size.
        // We estimate about 2 bytes per codepoint, even though some are 1 and some are 4.
        const size = data.messages.reduce(
            (size, message) => size + (message.text?.length ?? 0),
            0,
        );

        // If the chat is too big, keep trimming old messages until it fits.
        if (size > MAX_CHAT_MESSAGES_BYTES) {
            let newSize = size;
            let messages = data.messages;
            while (newSize > MAX_CHAT_MESSAGES_BYTES) {
                const message = messages.shift();
                if (message === undefined) break;
                newSize -= message.text?.length ?? 0;
            }
            this.data = { ...data, messages: messages };
        }
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

    /** Change the message's moderation status to "pending" */
    withReportedMessage(message: SerializedMessage, reporterID: string) {
        return new Chat({
            ...this.data,
            messages: this.data.messages.map((m) =>
                m.id === message.id
                    ? { ...m, moderation: 'pending', reporter: reporterID }
                    : m,
            ),
        });
    }

    /** Take moderation action on the message */
    withModeratedMessage(
        message: SerializedMessage,
        action: 'removed' | 'approved',
        moderatorID: string,
    ) {
        return new Chat({
            ...this.data,
            messages: this.data.messages.map((m) =>
                m.id === message.id
                    ? { ...m, moderation: action, moderator: moderatorID }
                    : m,
            ),
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

    /** List of messages in this chat that require moderation action from the curator */
    getMessagesPendingModeration(
        curatorID: string,
        gallery: Gallery | undefined,
    ): SerializedMessage[] {
        if (gallery === undefined || !gallery.hasCurator(curatorID)) return [];

        return this.data.messages.filter((m) => m.moderation === 'pending');
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

    getData() {
        return { ...this.data };
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

const ChatsCollection = Domain.Chats;

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
    private cacheChatsLocally(projectIDs: string[]) {
        if (!this.IndexedDBSupported || projectIDs.length === 0) return;
        const data: SerializedChat[] = [];
        for (const projectID of projectIDs) {
            const chat = this.chats.get(projectID);
            if (chat) data.push(chat.getData());
        }
        try {
            this.db.localDB.saveChats(data);
        } catch (error) {
            console.error(error);
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
            this.db.Projects.listen(projectID, this.projectsListener);
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

    /** Mark a message as reported (pending moderation). */
    async reportMessage(
        chat: Chat,
        message: SerializedMessage,
        reporterID: string,
    ) {
        this.chats.set(
            chat.getProjectID(),
            chat.withReportedMessage(message, reporterID),
        );
        await this.modifyChatMessage(chat.getProjectID(), message.id, (m) => ({
            ...m,
            moderation: 'pending',
            reporter: reporterID,
        }));
    }

    /** Apply a moderator's removal/approval to a message. */
    async moderateMessage(
        chat: Chat,
        message: SerializedMessage,
        action: 'removed' | 'approved',
        moderatorID: string,
    ) {
        this.chats.set(
            chat.getProjectID(),
            chat.withModeratedMessage(message, action, moderatorID),
        );
        await this.modifyChatMessage(chat.getProjectID(), message.id, (m) => ({
            ...m,
            moderation: action,
            moderator: moderatorID,
        }));
    }

    /** Clear a message's text (soft delete that preserves the message slot). */
    async deleteMessage(chat: Chat, message: SerializedMessage) {
        this.chats.set(chat.getProjectID(), chat.withoutMessage(message));
        await this.modifyChatMessage(chat.getProjectID(), message.id, (m) => ({
            ...m,
            text: null,
        }));
    }

    /** Drop a chat from in-memory state and clear its save tracking + durable
     *  dirty row. Does NOT delete the Firestore doc or the cached row — callers
     *  handle those (the cloud listener owns cache eviction). Shared by the
     *  explicit delete and the listener's "removed" handler. */
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
    ): Promise<string | undefined> {
        if (firestore === undefined) return undefined;
        if (project.getOwner() === null) return undefined;

        const newChat: SerializedChat = {
            v: 2,
            project: project.getID(),
            messages: [],
            // Everyone contributing is eligible to see and participate in the chat.
            participants: Array.from(this.getAllParticipants(project, gallery)),
            unread: [],
            type: 'project',
        };

        return this.createChat(newChat, () =>
            Projects.reviseProject(project.withChat(newChat.project)),
        );
    }

    async addChatToHowTo(howTo: HowTo, gallery: Gallery | undefined) {
        if (firestore === undefined) return undefined;
        if (howTo.getCreator() === null) return undefined;

        const newChat: SerializedChat = {
            v: 2,
            project: howTo.getHowToId(),
            messages: [],
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
                const project = await this.db.Projects.get(projectID);
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
            return false;
        }
    }

    async addMessage(
        chat: Chat,
        message: string,
    ): Promise<SerializedMessage | undefined> {
        const user = this.db.getUser()?.uid;
        if (user === undefined) return;
        if (firestore === undefined) return;
        const newMessage: SerializedMessage = {
            id: uuidv4(),
            text: message,
            time: Date.now(),
            creator: user,
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
        const startTime: number = Date.now();

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
                            this.db.Projects.ignore(
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
                    } else {
                        // added or modified? notify if there is a new message after the start time

                        const chatData: Chat | undefined = this.chats.get(
                            change.doc.id,
                        );

                        // only alert if the message was sent since the page was first opened
                        if (
                            !chatData ||
                            !chatData
                                .getMessages()
                                .some((m) => m.time > startTime)
                        )
                            return;

                        let title: string = '';
                        let galleryID: string = '';

                        if (chatData.getType() === 'project') {
                            const project = await this.db.Projects.get(
                                chatData.getProjectID(),
                            );
                            if (project) title = project.getName();
                        } else {
                            const howto = await this.db.HowTos.getHowTo(
                                chatData.getProjectID(),
                            );
                            if (howto) {
                                title = howto.getTitle();
                                galleryID = howto.getHowToGalleryId();
                            }
                        }

                        if (chatData.hasUnread(user.uid)) {
                            let itemID = chatData.getProjectID();
                            let type =
                                chatData.getType() === 'howto'
                                    ? 'howtochat'
                                    : 'projectchat';
                            notifications.set(itemID + type, {
                                title,
                                galleryID:
                                    chatData.getType() === 'howto'
                                        ? galleryID
                                        : undefined,
                                itemID: itemID,
                                type: type,
                            } as NotificationData);
                        }
                    }
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
