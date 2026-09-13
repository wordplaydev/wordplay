/**
 * Where a listing request stands after an edit — the client's copy of the rule the
 * `galleryEdited` and `kitEdited` triggers apply.
 *
 * Two copies because `functions/` compiles with its own `rootDir` and cannot be imported
 * from the app. The app needs it because the client never *writes* `moderation`: it writes
 * `public` and the trigger answers, so a panel reading the stored value says nothing at the
 * one moment a creator most wants an answer — just after asking. `nextModeration.test.ts`
 * runs both copies against one table, the way `overrideKey.test.ts` does.
 */
export type ModerationRequest =
    'unrequested' | 'pending' | 'approved' | 'denied';

export function nextModeration(
    current: ModerationRequest,
    isPublic: boolean,
    contentChanged: boolean,
    /** Whether this write is what asked. See the server copy for why asking has
     *  to be a transition rather than a state. */
    reRequested: boolean,
): ModerationRequest {
    // Not asking to be listed, so there's nothing pending.
    if (!isPublic) return 'unrequested';
    // Asking for the first time.
    if (current === 'unrequested') return 'pending';
    // A refusal stands until the creator asks again — by pressing the button
    // again, or by changing the thing that was refused.
    if (current === 'denied')
        return reRequested || contentChanged ? 'pending' : 'denied';
    // Approval was of what it was, not of whatever it becomes.
    if (current === 'approved' && contentChanged) return 'pending';
    return current;
}
