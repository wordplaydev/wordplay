/** This file encapsulates all Firebase chat functionality and relies on Svelte state to cache chat documents. */
import { FirebaseError } from 'firebase/app';
import type { Unsubscribe, User } from 'firebase/auth';
import {
    collection,
    Firestore,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import type { Database } from './Database';
import { firestore } from './firebase';

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
    text: z.string(),
});

const MessageSchema = MessageSchemaV1;

export type SerializedMessage = z.infer<typeof MessageSchema>;

const ChatSchemaV1 = z.object({
    // The version of the schema
    v: z.literal(1),
    /** A UUID corresponding to the project ID to which this chat applies */
    project: z.string(),
    /**
     * A list of creator IDs who can contribute to this chat.
     * This is redundant with who has permission, but necessary to repeat
     * here for querying purposes. Yay NoSQL... */
    participants: z.array(z.string()),
    /** A list of chat messages */
    messages: z.array(MessageSchema),
    /**
     * A list of creator IDs who have not seen the latest message. This is updated by clients
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

/** An immutable wrapper class for accessing and manipulating chat data */
export default class Chat {
    /** The data of the chat. */
    private readonly data: SerializedChat;

    constructor(data: SerializedChat) {
        this.data = data;
    }

    getProjectID() {
        return this.data.project;
    }
    getParticipants() {
        return this.data.participants;
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
}

////////////////////////////////
// CACHE
////////////////////////////////

const ChatsCollection = 'chats';

export class ChatDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores chats obtained from Firestore */
    private readonly chats = new SvelteMap<string, Chat>();

    private unsubscribe: Unsubscribe | undefined = undefined;

    constructor(db: Database) {
        this.db = db;
    }

    syncUser() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (user) this.listen(firestore, user);
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
                    const { data: chat } = doc.data();

                    // Try to parse the chat and save on success.
                    try {
                        ChatSchema.parse(chat);
                        this.chats.set(chat.id, new Chat(chat.data));
                    } catch (error) {
                        // If the chat doesn't succeed, then we don't save it.
                        console.log(error);
                    }
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    if (change.type === 'removed')
                        this.chats.delete(change.doc.id);
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
