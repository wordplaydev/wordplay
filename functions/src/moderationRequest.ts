/**
 * Where a listing request stands after an edit — the rule the `galleryEdited` and
 * `kitEdited` triggers apply, and the app's publish panel previews.
 *
 * A leaf with no `firebase-admin` import, so the app side can hold it to one table of
 * cases (`src/db/moderation/nextModeration.test.ts`) without dragging the Admin SDK into
 * the client's graph. The same split `searchWords.ts` makes for the same reason.
 */
export type ModerationRequest =
    'unrequested' | 'pending' | 'approved' | 'denied';

/**
 * The transition lives on the server rather than in a client or a security rule because it
 * is the one thing a creator must not be able to write: `public` is their request, and
 * this is the answer to it. An approval is of what the subject *was*, so changing what it
 * claims about itself puts it back in the queue.
 */
export function nextModeration(
    current: string,
    isPublic: boolean,
    contentChanged: boolean,
): string {
    // Not asking to be listed, so there's nothing pending.
    if (!isPublic) return 'unrequested';
    // Asking for the first time, or asking again after a denial.
    if (current === 'unrequested' || current === 'denied') return 'pending';
    // Approval was of what the gallery was, not of whatever it becomes.
    if (current === 'approved' && contentChanged) return 'pending';
    return current;
}
