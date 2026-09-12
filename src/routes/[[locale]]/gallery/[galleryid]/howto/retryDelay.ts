/**
 * How long to wait before asking the database again about a how-to space we
 * couldn't reach.
 *
 * `resolveGallery` answers "we couldn't go look" with `null` rather than
 * "it isn't there", and its docstring promises the caller re-runs it "whenever
 * the maps change, so a recovered connection resolves it". For a *signed-out*
 * visitor that promise was empty: `HowToDatabase.listen` tears every listener
 * down when there is no user and the galleries query is user-scoped, so the
 * maps never change again, `hydrated` and `authAttempted` each settle once, and
 * nothing re-runs the effect. One read that overran `Database.READ_TIMEOUT_MS`
 * left a public space blank for the rest of the page's life, with no error and
 * no way back but a reload.
 *
 * So the page asks again on a schedule of its own. Backing off matters because
 * the common cause is a slow first connection rather than a broken one — the
 * second ask usually lands on a warm one — and capping the backoff rather than
 * giving up matters because giving up is the bug: a page left open across a
 * tunnel or a sleeping laptop should come back on its own.
 */

/** Long enough that an instant re-ask can't hammer a struggling backend, short
 *  enough that a first slow connection is recovered before anyone reloads. */
export const FirstRetryDelay = 500;

/**
 * Where the doubling stops, and it is deliberately small.
 *
 * Back off in proportion to what an attempt costs, not to how many there have
 * been. A read that cannot reach the backend is rejected by the SDK in
 * milliseconds — `Failed to get document because the client is offline`, no
 * network involved — so six failures pass in seventeen seconds and a doubling
 * delay is already sixteen. The page then sleeps through a network that has
 * come back, which is the very thing this file exists to prevent.
 *
 * Measured against the emulator with Firestore cut for 20s and then restored:
 * a 30s cap recovered 14.6s after the cloud returned, a 3s cap 4.2s. The
 * remainder is the Firestore SDK's own reconnect, which we do not control.
 *
 * The cost of asking this often is near zero for the same reason the delay can
 * be short: an offline read never leaves the browser.
 */
export const MaxRetryDelay = 3_000;

/**
 * The delay before attempt `attempt + 1`, given `attempt` failed asks so far.
 * Doubles from {@link FirstRetryDelay} and holds at {@link MaxRetryDelay}.
 */
export default function retryDelay(attempt: number): number {
    if (attempt <= 0) return FirstRetryDelay;
    // Clamp the exponent before computing it: 2 ** 2000 is Infinity, and
    // Math.min(Infinity, cap) is the cap, but a page open for a week should not
    // be computing Infinity to find that out.
    const doublings = Math.min(attempt, 32);
    return Math.min(FirstRetryDelay * 2 ** doublings, MaxRetryDelay);
}
