/** This file encapsulates all Firebase chat functionality and relies on Svelte state to cache chat documents. */
import { FirebaseError } from 'firebase/app';
import type { Unsubscribe, User } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    Firestore,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import { Projects, type Database } from './Database';
import { firestore } from './firebase';
import type Project from '@models/Project';
import { v4 as uuidv4 } from 'uuid';
import type Gallery from '@models/Gallery';

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

const MessageSchema = MessageSchemaV1;

export type SerializedMessage = z.infer<typeof MessageSchema>;

const ChatSchemaV1 = z.object({
    // The version of the schema
    v: z.literal(1),
    /** A UUID corresponding to the project ID to which this chat applies. Also the id for the chat in the collection. */
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

const ChatSchema = ChatSchemaV1;

export type SerializedChat = z.infer<typeof ChatSchemaV1>;

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
            this.data = {
                ...data,
                messages: messages,
            };
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

        return new Chat({
            ...this.data,
            messages: mergedMessages,
        });
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

    /** With the unread user unread */
    asRead(creator: string) {
        return new Chat({
            ...this.data,
            unread: this.data.unread.filter((u) => u !== creator),
        });
    }

    getData() {
        return { ...this.data };
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

const ChatsCollection = 'chats';

export class ChatDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores chats obtained from Firestore */
    private readonly chats = $state(new SvelteMap<string, Chat>());

    private unsubscribe: Unsubscribe | undefined = undefined;

    private projectsListener: (project: Project) => void;
    private galleryListener: (gallery: Gallery) => void;

    constructor(db: Database) {
        this.db = db;
        this.projectsListener = this.handleRevisedProject.bind(this);
        this.galleryListener = this.handleRevisedGallery.bind(this);
    }

    /** Take the given chat and update it's state locally, and optionally remotely. */
    async updateChat(chat: Chat, persist: boolean) {
        const projectID = chat.getProjectID();

        // Get the existing chat, if it exists, so we can merge it's existing texts.
        const existingMessages = this.chats.get(projectID)?.getMessages() ?? [];
        chat = chat.withMergedMessages(existingMessages);

        // Set the revised chat for the project in the local state, propogating updates.
        this.chats.set(projectID, chat);

        // Make sure we're listening to updates on the chat's project.
        this.db.Projects.listen(projectID, this.projectsListener);

        // Make sure we're listening to the gallery of the project.
        this.db.Galleries.listen(projectID, this.galleryListener);

        // If asked to persist, update remotely.
        if (persist && firestore) {
            await updateDoc(
                doc(firestore, ChatsCollection, chat.getProjectID()),
                chat.getData(),
            );
        }
    }

    async deleteChat(projectID: string) {
        this.chats.delete(projectID);
        if (firestore) {
            try {
                await deleteDoc(doc(firestore, ChatsCollection, projectID));
            } catch (err) {
                console.error(err);
            }
        }
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user) this.listen(firestore, user);
    }

    /** Create a chat, if the project is owned and doesn't already have one. */
    async addChat(
        project: Project,
        gallery: Gallery | undefined,
    ): Promise<string | undefined> {
        if (firestore === undefined) return undefined;
        const owner = project.getOwner();
        if (owner === null) return undefined;

        // Create a new chat.
        const newChat: SerializedChat = {
            v: 1,
            project: project.getID(),
            messages: [],
            // Everyone contributing is eligible to see and participate in the chat.
            participants: Array.from(
                new Set([
                    ...(gallery ? gallery.getCurators() : []),
                    ...project.getContributors(),
                ]),
            ),
            unread: [],
        };

        // Add the chat to Firebase, relying on the realtime listener to update the local cache.
        try {
            // Create the document.
            await setDoc(
                doc(firestore, ChatsCollection, newChat.project),
                newChat,
            );

            // Add the chat to the chats cache, but not remotely; we just created it.
            this.updateChat(new Chat(newChat), false);

            // Add the chat to the project once we've added it to the database.
            Projects.reviseProject(project.withChat(newChat.project));
        } catch (err) {
            console.error(err);
            return undefined;
        }

        return newChat.project;
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
            ...new Set([
                ...project.getContributors(),
                ...(gallery ? gallery.getCurators() : []),
            ]),
        ].sort();

        // If they're not updated, update them.
        if (currentChatParticipantsString !== intendedChatParticipants.join()) {
            // Update the chat with the new list of contributors.
            this.updateChat(
                new Chat({
                    ...chat.getData(),
                    participants: intendedChatParticipants,
                }),
                true,
            );
        }
    }

    /** Get the chat for this project. Undefined if there isn't one, false if we couldn't due to an error. */
    async getChat(project: Project): Promise<Chat | undefined | false> {
        const chatID = project.getID();
        if (chatID === null) return undefined;

        // Do we have the chat cached? Return it.
        const chat = this.chats.get(chatID);
        if (chat) return chat;

        // If not, see if it's in the database.
        if (firestore === undefined) return undefined;
        try {
            const chatDoc = await getDoc(
                doc(firestore, ChatsCollection, chatID),
            );
            if (chatDoc.exists()) {
                const remoteChat = chatDoc.data();
                if (remoteChat === undefined) return undefined;

                const newChat = new Chat(remoteChat as SerializedChat);
                // Update the chat locally, but do not persist, we already know it's in the database..
                this.updateChat(newChat, false);
                return newChat;
            } else return undefined;
        } catch (err) {
            console.log(err);
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
        const newMessage = {
            id: uuidv4(),
            text: message,
            time: Date.now(),
            creator: user,
        };

        // Perist the revised chat, but don't wait for the remote update.
        this.updateChat(chat.withMessage(newMessage), true);
        return newMessage;
    }

    ignore() {
        if (this.unsubscribe) this.unsubscribe();
    }

    listen(firestore: Firestore, user: User) {
        this.ignore();
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, ChatsCollection),
                where('participants', 'array-contains', user.uid),
            ),
            async (snapshot) => {
                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const chat = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        ChatSchema.parse(chat);
                        // Update the chat in the local cache, but do not persist; we just got it from the DB.
                        this.updateChat(
                            new Chat(chat as SerializedChat),
                            false,
                        );
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
                        const projectID = change.doc.id;
                        this.chats.delete(projectID);
                        if (this.projectsListener)
                            this.db.Projects.ignore(
                                projectID,
                                this.projectsListener,
                            );
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
}
