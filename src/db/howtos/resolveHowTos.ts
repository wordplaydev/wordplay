import type HowTo from './HowToDatabase.svelte';

/** What one lookup can say: the how-to, `undefined` for "isn't there", `false`
 *  for "couldn't go look". */
export type HowToLookup = (id: string) => Promise<HowTo | undefined | false>;

export type HowTosResult = {
    /** Everything that resolved, in the order asked for. */
    howTos: HowTo[];
    /** Whether any id was still unreachable after the retry. */
    unreachable: boolean;
};

/** How long to wait before the one retry. Short because the read it follows has
 *  already spent its own budget failing. */
const RETRY_DELAY_MS = 300;

/**
 * Exactly one retry. `Database.read` gives each read an 8s budget, so two
 * attempts is already up to 16s of someone watching an empty space, and a third
 * would be worth less than telling them sooner that we came up empty.
 */
const ATTEMPTS = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The how-tos of a gallery, retrying the ones we couldn't reach.
 *
 * A signed-out visitor is the reason this exists (#1375). Everyone else gets
 * their how-tos from a listener, and the page effect reads the database's map
 * synchronously, so it is *subscribed* to it: a slow first read heals when the
 * snapshot lands and the effect re-runs. A visitor starts no listener at all —
 * every query in `HowToDatabase` is built from a uid — so their only path is one
 * `getHowTo` per id, and `getHowTo` swallows a failed read as `false`. Nothing
 * re-ran, so one timed-out read left the space permanently empty: the canvas and
 * the navigation menu both render from this list. Under a loaded emulator on
 * WebKit, which is ~2-3x slower than Chromium for Firestore round-trips, that is
 * how a public space with a how-to in it showed a visitor nothing.
 *
 * "Couldn't go look" is kept apart from "isn't there" for the reason
 * `GalleryDatabase.find` keeps them apart, and the caller needs the difference:
 * an empty list that came from a failed read must not replace a good one.
 */
export default async function resolveHowTos(
    ids: string[],
    lookup: HowToLookup,
    wait: (ms: number) => Promise<unknown> = sleep,
): Promise<HowTosResult> {
    const found = new Map<string, HowTo>();
    let pending = ids;

    for (let attempt = 0; attempt < ATTEMPTS && pending.length > 0; attempt++) {
        if (attempt > 0) await wait(RETRY_DELAY_MS);

        // Called with the id alone: `map` would otherwise hand a lookup an
        // index and an array it never asked for.
        const results = await Promise.all(pending.map((id) => lookup(id)));
        const retry: string[] = [];
        results.forEach((result, index) => {
            const id = pending[index];
            if (id === undefined) return;
            // `undefined` is an answer — it isn't there, or isn't ours to see —
            // so it is never retried. Only `false` is a question we failed to ask.
            if (result === false) retry.push(id);
            else if (result !== undefined) found.set(id, result);
        });
        pending = retry;
    }

    return {
        howTos: ids
            .map((id) => found.get(id))
            .filter((howTo): howTo is HowTo => howTo !== undefined),
        unreachable: pending.length > 0,
    };
}
