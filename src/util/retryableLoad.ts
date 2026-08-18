/**
 * Memoize a lazy loader, but not its failures.
 *
 * The obvious `promise ??= import(…)` caches the *promise*, including a
 * rejected one — so a chunk fetch that failed once (a flaky network, a deploy
 * that changed the hash) breaks that feature for the life of the tab, and every
 * later attempt fails instantly with no retry. Dropping the cached promise on
 * rejection keeps the "load at most once" guarantee for successes while leaving
 * a failure retryable.
 */
export default function retryableLoad<T>(
    load: () => Promise<T>,
): () => Promise<T> {
    let pending: Promise<T> | undefined = undefined;
    return () =>
        (pending ??= load().catch((error: unknown) => {
            pending = undefined;
            throw error;
        }));
}
