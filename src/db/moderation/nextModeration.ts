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
): ModerationRequest {
    // Not asking to be listed, so there's nothing pending.
    if (!isPublic) return 'unrequested';
    // Asking for the first time, or asking again after a denial.
    if (current === 'unrequested' || current === 'denied') return 'pending';
    // Approval was of what it was, not of whatever it becomes.
    if (current === 'approved' && contentChanged) return 'pending';
    return current;
}
