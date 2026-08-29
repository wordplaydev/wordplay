import { getFirestore } from 'firebase-admin/firestore';
import type { FirestoreEvent } from 'firebase-functions/v2/firestore';
import { forgetChatTranslations } from './chatTranslations.js';

/**
 * Collect a deleted chat's translation cache.
 *
 * A trigger rather than a step in `ChatDatabase.deleteChat`, because deleting
 * the chat document is not the only way a conversation ends — a project purged
 * by `purgeArchivedProjects`, a how-to deleted with its chat left behind, an
 * account closed — and every one of them has to reach the cache, which nothing
 * client-side can once the chat it hangs from is gone.
 */
export default async function chatDeleted(
    event: FirestoreEvent<unknown, { chat: string }>,
): Promise<void> {
    await forgetChatTranslations(getFirestore(), event.params.chat);
}
