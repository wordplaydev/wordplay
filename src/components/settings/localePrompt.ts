import retryableLoad from '@util/retryableLoad';

/**
 * Local-storage key recording that this device has been offered the chooser, whether
 * the reader picked a language or waved it away.
 *
 * A plain key rather than a registered Setting on purpose. It's device-local
 * bookkeeping, not a preference worth syncing to an account — and neither of the two
 * things it has to remember can be read off the `locales` setting itself. `Setting.set`
 * skips the write when the value is unchanged, so someone who picks English, already
 * the default, stores nothing and would be asked forever; and declining stores nothing
 * by definition, yet has to stick, or one stray click on the dialog's backdrop means
 * being interrupted on every future visit.
 */
const AskedKey = 'localeAsked';

function storage(): Storage | undefined {
    return typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined'
        ? window.localStorage
        : undefined;
}

/** Whether this device has already been offered the chooser. */
export function hasBeenAsked(): boolean {
    return storage()?.getItem(AskedKey) === 'true';
}

/** Remember that we asked, so we don't ask again on this device. */
export function markAsked() {
    storage()?.setItem(AskedKey, 'true');
}

/**
 * Loads the first-run language prompt on demand.
 *
 * The root layout decides whether to offer it, which would otherwise put the chooser —
 * and with it every ISO language and region — into the import graph of every page in
 * the app, for a dialog almost nobody sees.
 *
 * Memoized at module scope but never awaited there: a module-level await anywhere in
 * the app graph reorders WebKit's module evaluation across the route/db import cycle
 * and crashes hydration.
 */
export const loadLocalePrompt = retryableLoad(() =>
    import('@components/settings/LocalePrompt.svelte').then(
        (module) => module.default,
    ),
);

/**
 * When to greet a visitor with the language chooser (#1256).
 *
 * The app boots in English for everyone: browser languages are detected, but only to
 * preload locale files — `LocalesDatabase.computeLocales()` reads the stored setting
 * alone. So someone who can't read English sees an English page with no way to know that
 * the English word in the footer is the way out. This opens the chooser for them, once.
 *
 * Pure and separate from the component so each condition is testable: an auto-opening
 * modal is easy to get subtly wrong, and every one of these conditions is here because
 * getting it wrong shows a modal to someone who shouldn't see one.
 */
export type LocalePromptState = {
    /** Whether a locale segment is present in the URL (`/es-MX/...`). Someone who
     *  arrived by a locale-bearing link has a language already. */
    urlLocale: string | undefined;
    /** The matched route's id, or null when nothing matched. The static build's
     *  `200.html` fallback renders the error page with empty params, which otherwise
     *  looks exactly like "no locale segment" — and a language modal on top of a 404 is
     *  not a welcome. */
    routeId: string | null;
    /** Whether the `locales` setting has ever been written to local storage. */
    localesPersisted: boolean;
    /** Whether we've already asked on this device (chosen *or* dismissed). */
    asked: boolean;
    /** Whether authentication has resolved one way or the other. */
    authAttempted: boolean;
    /** The signed-in user: undefined until auth resolves, null when signed out. */
    user: unknown | null | undefined;
    /** Whether the reader has already started interacting with the page. */
    interacting: boolean;
};

export default function shouldPromptForLocale({
    urlLocale,
    routeId,
    localesPersisted,
    asked,
    authAttempted,
    user,
    interacting,
}: LocalePromptState): boolean {
    // A URL that names a language, or a URL that names nothing we serve.
    if (urlLocale !== undefined || routeId === null) return false;

    // Already chose a language, or already been asked and said no. Dismissal counts:
    // otherwise one stray click on the backdrop means being asked again forever.
    if (localesPersisted || asked) return false;

    // Signed-in creators have preferred locales on their account. `user` must be
    // exactly null — `authAttempted` is also set when the auth SDK fails to load or
    // isn't configured, and there `user` stays undefined, so treating undefined as
    // "signed out" would interrupt a signed-in user whose auth chunk was blocked.
    if (!authAttempted || user !== null) return false;

    // Because this waits on authentication, it can resolve seconds after the page is
    // usable. Stealing focus from someone already typing in the editor or working
    // through the tutorial is worse than never asking them.
    if (interacting) return false;

    return true;
}
