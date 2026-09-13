/**
 * Ref-counted subscriptions keyed by a string, so several parts of the interface
 * can ask to watch the same thing and share one subscription.
 *
 * A gallery's how-tos are shown in four places at once — the how-to canvas, the
 * project's docs tile, the project view's concept index, and the gallery page's
 * how-to tile — and each mounts and unmounts on its own schedule. Without
 * sharing, four surfaces looking at one gallery would open four identical
 * Firestore listeners and pay for four copies of every document.
 *
 * Deliberately knows nothing about Firestore: `start` returns whatever undoes
 * it, so the whole contract is testable without a backend.
 */
export default class Watchers {
    private readonly watching = new Map<
        string,
        { count: number; start: () => () => void; stop: () => void }
    >();

    /**
     * Ask for `key` to be watched, starting it if nobody else is. Returns the
     * release, which is safe to call more than once — a Svelte effect teardown
     * that ran twice would otherwise drop the count below what is still held.
     */
    watch(key: string, start: () => () => void): () => void {
        const existing = this.watching.get(key);
        if (existing) existing.count++;
        else this.watching.set(key, { count: 1, start, stop: start() });

        let released = false;
        return () => {
            if (released) return;
            released = true;
            const current = this.watching.get(key);
            if (current === undefined) return;
            current.count--;
            if (current.count <= 0) {
                current.stop();
                this.watching.delete(key);
            }
        };
    }

    /**
     * Tear down and re-run `start`, keeping whatever holds the key. For a
     * decision that has changed (a viewer who signed in, a gallery that became
     * public) and for a cache that was emptied underneath a live listener, which
     * will not re-deliver on its own because nothing changed on the server.
     */
    restart(key?: string) {
        for (const [id, current] of this.watching)
            if (key === undefined || id === key) {
                current.stop();
                current.stop = current.start();
            }
    }

    /** Stop watching `key` regardless of who still holds it. */
    stop(key: string) {
        const current = this.watching.get(key);
        if (current === undefined) return;
        current.stop();
        this.watching.delete(key);
    }

    stopAll() {
        for (const current of this.watching.values()) current.stop();
        this.watching.clear();
    }

    has(key: string) {
        return this.watching.has(key);
    }

    /** The keys currently watched, for callers that re-decide each one. */
    keys(): string[] {
        return Array.from(this.watching.keys());
    }
}
