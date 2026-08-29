import {
    FieldPath,
    FieldValue,
    type Firestore,
} from 'firebase-admin/firestore';

const ChatsCollection = 'chats';

/** Where a chat's cached machine translations live, one document per target
 *  language holding {messageID: translated text}. Mirrors the client's
 *  ChatDatabase.svelte.ts, which cannot be imported here. */
export const TranslationsCollection = 'translations';

/**
 * Forget every cached translation of one message, in every language.
 *
 * A translation is a copy of the words, so taking a message down has to take
 * the copies with it. Otherwise "hidden while someone reviews it" is true only
 * of the original, and the reported sentence stays readable to every
 * participant in whichever language they last asked for — the same mistake as
 * leaving the text in the chat behind a client-side `{#if}`, which is what
 * #938 was about.
 *
 * Here rather than on the client for the reason the takedown itself is: the
 * person whose message was reported is a participant, and a participant relied
 * on to erase their own words will not.
 *
 * Best effort. The report or the decision has already landed by the time this
 * runs, and refusing a takedown because a cache would not tidy up would be the
 * wrong way round.
 */
export async function forgetMessageTranslations(
    db: Firestore,
    chatID: string,
    messageID: string,
): Promise<void> {
    try {
        const languages = await db
            .collection(ChatsCollection)
            .doc(chatID)
            .collection(TranslationsCollection)
            .get();
        if (languages.empty) return;
        const batch = db.batch();
        for (const language of languages.docs)
            // A FieldPath rather than a computed `{[messageID]: …}` key: an
            // update object's keys are read as dotted field paths, and a
            // message id is a UUID this code has no say over. Naming the field
            // once, unparsed, means an id that ever stops being a UUID cannot
            // quietly start addressing something nested.
            batch.update(
                language.ref,
                new FieldPath(messageID),
                FieldValue.delete(),
            );
        await batch.commit();
    } catch (error) {
        console.error(error);
    }
}

/**
 * Delete a chat's whole translation cache, when the chat itself is gone.
 *
 * Firestore does not delete a subcollection with its parent, and the cache's
 * rule reads the parent chat to find out who may touch it — so once the chat
 * is deleted no client can reach these documents at all, to read them or to
 * collect them. Copies of everything everyone said would sit there for good.
 * The Admin SDK ignores rules, which is what makes this the only thing that
 * can do it.
 */
export async function forgetChatTranslations(
    db: Firestore,
    chatID: string,
): Promise<void> {
    await db.recursiveDelete(
        db
            .collection(ChatsCollection)
            .doc(chatID)
            .collection(TranslationsCollection),
    );
}
