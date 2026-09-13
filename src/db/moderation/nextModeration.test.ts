import { expect, test } from 'vitest';
// The server's own copy, from the leaf it lives in so this test doesn't pull the Admin
// SDK into the client's graph. `functions/` compiles with its own `rootDir` and can't
// import this side; this side can import it, which is what lets one table hold both to the
// same contract. A drift would make the publish panel promise a state the server won't reach.
import { nextModeration as onServer } from '../../../functions/src/moderationRequest';
import { nextModeration, type ModerationRequest } from './nextModeration';

/** current, asked to be listed, content changed, this write is the ask → what
 *  the state becomes. */
const cases: [
    ModerationRequest,
    boolean,
    boolean,
    boolean,
    ModerationRequest,
][] = [
    // Not asking. Nothing is pending, whatever it was before.
    ['unrequested', false, false, false, 'unrequested'],
    ['approved', false, false, false, 'unrequested'],
    ['pending', false, true, false, 'unrequested'],
    // Asking for the first time.
    ['unrequested', true, false, true, 'pending'],
    // A refusal stands while nothing happens. This row used to read 'pending',
    // which meant the trigger firing on `moderate`'s own denial erased it: a
    // denied gallery or kit went straight back into the queue and stayed there
    // forever, and nobody could ever receive a `gallery-denied` notice.
    ['denied', true, false, false, 'denied'],
    // Until the creator asks again — by pressing the button, which is how a
    // how-to re-requests, or by changing what was refused.
    ['denied', true, false, true, 'pending'],
    ['denied', true, true, false, 'pending'],
    // Already waiting: still waiting.
    ['pending', true, false, false, 'pending'],
    ['pending', true, true, false, 'pending'],
    // Approved. Only a change to what was approved re-enters the queue.
    ['approved', true, false, false, 'approved'],
    ['approved', true, true, false, 'pending'],
];

test.each(cases)(
    '%s + public=%s + changed=%s + asked=%s becomes %s',
    (current, isPublic, changed, asked, expected) => {
        expect(nextModeration(current, isPublic, changed, asked)).toBe(
            expected,
        );
        expect(onServer(current, isPublic, changed, asked)).toBe(expected);
    },
);

test('the rule is idempotent, because the trigger sees its own write', () => {
    for (const [current, isPublic, changed, asked] of cases) {
        const once = nextModeration(current, isPublic, changed, asked);
        // Re-entry changes none of the fields `contentChanged` or the request
        // flag read, so the second pass asks with `false` for both and must
        // settle rather than move again. This is exactly the pass that used to
        // undo a denial.
        expect(nextModeration(once, isPublic, false, false)).toBe(once);
    }
});
