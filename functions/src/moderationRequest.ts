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
    /**
     * Whether *this write* is what asked — the request flag going from off to
     * on. Asking is a transition, not a state, and conflating the two is what
     * made a denial erase itself: `moderate` writes `denied` while a gallery or
     * kit is still `public`, that write comes back through the trigger, and a
     * rule reading only "is public and was denied" answered `pending` a moment
     * after the refusal was recorded. The item then re-entered the queue
     * forever and `gallery-denied` was a notice nobody could ever receive.
     *
     * How-tos never had the bug, because denying one also clears
     * `submittedToGuide` — so for them this argument is the button press that
     * the trigger's own comment already describes.
     */
    reRequested: boolean,
): string {
    // Not asking to be listed, so there's nothing pending.
    if (!isPublic) return 'unrequested';
    // Asking for the first time.
    if (current === 'unrequested') return 'pending';
    // A refusal stands until the creator asks again — by pressing the button
    // again, or by changing the thing that was refused.
    if (current === 'denied')
        return reRequested || contentChanged ? 'pending' : 'denied';
    // Approval was of what the gallery was, not of whatever it becomes.
    if (current === 'approved' && contentChanged) return 'pending';
    return current;
}
