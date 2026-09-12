import { expect, test } from 'vitest';
// The server's own copy, from the leaf it lives in so this test doesn't pull the Admin
// SDK into the client's graph. `functions/` compiles with its own `rootDir` and can't
// import this side; this side can import it, which is what lets one table hold both to the
// same contract. A drift would make the publish panel promise a state the server won't reach.
import { nextModeration as onServer } from '../../../functions/src/moderationRequest';
import { nextModeration, type ModerationRequest } from './nextModeration';

/** current, asked to be listed, content changed → what the state becomes. */
const cases: [ModerationRequest, boolean, boolean, ModerationRequest][] = [
    // Not asking. Nothing is pending, whatever it was before.
    ['unrequested', false, false, 'unrequested'],
    ['approved', false, false, 'unrequested'],
    ['pending', false, true, 'unrequested'],
    // Asking, for the first time or again after a refusal.
    ['unrequested', true, false, 'pending'],
    ['denied', true, false, 'pending'],
    // Already waiting: still waiting.
    ['pending', true, false, 'pending'],
    ['pending', true, true, 'pending'],
    // Approved. Only a change to what was approved re-enters the queue.
    ['approved', true, false, 'approved'],
    ['approved', true, true, 'pending'],
];

test.each(cases)(
    '%s + public=%s + changed=%s becomes %s',
    (current, isPublic, changed, expected) => {
        expect(nextModeration(current, isPublic, changed)).toBe(expected);
        expect(onServer(current, isPublic, changed)).toBe(expected);
    },
);

test('the rule is idempotent, because the trigger sees its own write', () => {
    for (const [current, isPublic, changed] of cases) {
        const once = nextModeration(current, isPublic, changed);
        // Re-entry changes none of the fields `contentChanged` reads, so the second pass
        // asks with `false` and must settle rather than move again.
        expect(nextModeration(once, isPublic, false)).toBe(once);
    }
});
