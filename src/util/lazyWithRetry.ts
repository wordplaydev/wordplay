/** Wrap an async loader so concurrent callers share one in-flight load and a
 *  successful result is memoized permanently — but a rejected load clears the
 *  memo, so the next call retries the loader instead of replaying the cached
 *  rejection. Memoizing rejections wedged auth for the life of the tab: one
 *  failed SDK chunk fetch and every later `ensureAuth()` rejected, leaving the
 *  login page unable to render until the browser restarted. */
export default function lazyWithRetry<T>(
    load: () => Promise<T>,
): () => Promise<T> {
    let memo: Promise<T> | undefined = undefined;
    return () => {
        if (memo === undefined) {
            const attempt = load();
            memo = attempt;
            // Clear the memo on rejection (unless a newer attempt replaced it)
            // without swallowing it: callers get `attempt`, not this chain.
            attempt.catch(() => {
                if (memo === attempt) memo = undefined;
            });
        }
        return memo;
    };
}
