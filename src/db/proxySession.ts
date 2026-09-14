/**
 * Whether this *tab* is a proxy session (#1313), and nothing else.
 *
 * Zero imports on purpose. `firebase.ts` and `Database.ts` both ask at module
 * init — before anything else in the app exists — and both are on every page's
 * import graph, which sits at its file ceiling (see importGraph.test.ts). A
 * module that answered this by reaching for a store or a setting would put that
 * store on all five graphs.
 *
 * The answer is latched in `sessionStorage` rather than read from the URL each
 * time, and that is the load-bearing part. The proxy tab opens at /proxy, but a
 * reader then navigates to /projects, and a reload *there* would find no marker
 * in the URL — so the tab would boot as an ordinary session, against the shared
 * local database and the admin's own signed-in account. Latching means the tab
 * is a proxy tab for as long as it lives, wherever it has navigated to.
 *
 * `sessionStorage` is also exactly the right lifetime: per tab, surviving
 * reloads, gone when the tab closes — the same lifetime as the auth session,
 * which uses `browserSessionPersistence` for the same reason. The two cannot
 * disagree.
 *
 * It cannot leak from the admin's own tab because /admin opens the proxy tab
 * with `noopener`, which gives it a fresh sessionStorage rather than a copy of
 * its opener's.
 */

/** The tab-scoped marker. */
const ProxyKey = 'wordplay.proxy';

/** Where the tab remembers when its session stops being able to read, so the
 *  banner can say so across a reload. Here rather than beside the callable that
 *  produces it, so the banner — which the root layout mounts on every page —
 *  needn't reach into `@db/admin` to read one string. */
export const ProxyUntilKey = 'proxy.until';

/** The route that starts one. Kept here rather than imported, so that the
 *  decision needs nothing from the router. */
const ProxyPath = '/proxy';

/**
 * The per-tab id `ProjectsDatabase` keys presence and CRDT authorship on.
 *
 * Spelled out rather than imported, because this module must stay
 * import-free — `proxySessionKeys.test.ts` holds the two spellings together.
 */
const SessionIDKey = 'wordplay.sessionID';

/** Answered once per page load: nothing can become a proxy session later, and
 *  nothing can stop being one. */
let proxying: boolean | undefined = undefined;

export function isProxySession(): boolean {
    if (proxying !== undefined) return proxying;
    // Server-side rendering and the locale verifier's tsx runtime have neither.
    if (typeof window === 'undefined') return (proxying = false);
    try {
        if (window.sessionStorage.getItem(ProxyKey) !== null)
            return (proxying = true);
        // Landing on /proxy is what makes this tab one, from now on.
        if (window.location.pathname.endsWith(ProxyPath)) {
            window.sessionStorage.setItem(ProxyKey, '1');
            // A tab opened from another one starts with a *copy* of its
            // opener's session storage, so this tab may have arrived holding
            // the administrator's own session id. ProjectsDatabase treats that
            // id as one editor: sharing it would make the two tabs filter out
            // each other's live edits, write the same presence document, and —
            // worst — delete the administrator's presence when the proxy tab
            // closes. It documents that collision as rare and cosmetic, which
            // is true of Duplicate Tab and not true here, where it would happen
            // every time.
            //
            // Cleared rather than trusted to `noopener`: the opener passes it
            // for exactly this reason, but browsers have disagreed about
            // whether an implicitly-noopener tab gets a fresh shed, and this is
            // not a thing to find out about from a bug report.
            window.sessionStorage.removeItem(SessionIDKey);
            return (proxying = true);
        }
    } catch {
        // A browser refusing storage (private window, blocked site data) cannot
        // hold a proxy session safely, since the isolation this decides is what
        // keeps it off the admin's own data. Fail closed: not a proxy tab.
        return (proxying = false);
    }
    return (proxying = false);
}

/** Where the local database and the settings live for this tab. Both are
 *  namespaced rather than shared, so an account switch inside a proxy tab can
 *  never reach the admin's own cached or local-only projects. */
export function proxyPrefix(): string {
    return isProxySession() ? 'proxy.' : '';
}

/**
 * How long a read-only session has left, in whole minutes.
 *
 * Rounded *up*, so a session with forty seconds on it says "1 minute left"
 * rather than "0 minutes left" while it is still working — the number should
 * only reach zero when the session actually has.
 *
 * Pure, and separate from the banner that renders it, because the arithmetic is
 * the part worth testing: an hour is too long to wait for in a browser.
 */
export function minutesLeft(until: number, now: number): number {
    return Math.max(0, Math.ceil((until - now) / 60000));
}

/** Whether a read-only session has run out. */
export function hasEnded(until: number, now: number): boolean {
    return now >= until;
}
