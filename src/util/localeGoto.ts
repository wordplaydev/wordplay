import { goto } from '$app/navigation';
import { page } from '$app/state';

type GotoOptions = Parameters<typeof goto>[1];

/** Prefix a path with the current locale segment, the way {@link localeGoto}
 *  does. For the rare case that needs the URL rather than the navigation —
 *  opening a new window, say. */
export function localePath(path: string): string {
    const locale = (page.params as Record<string, string>).locale;
    return locale ? `/${locale}${path === '/' ? '' : path}` : path;
}

/** A path with the current locale segment removed, so it can be stored and
 *  later re-prefixed (by {@link localePath} or `Link`) in whatever locale the
 *  reader is in by then. Prefixing an already-prefixed path is how a link back
 *  to the guide became `/en-US/en-US/guide`. */
export function unlocalePath(path: string): string {
    const locale = (page.params as Record<string, string>).locale;
    if (!locale) return path;
    const prefix = `/${locale}`;
    // Whole segment only: with locale `en`, a prefix match alone turns
    // `/energy` into `ergy`.
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return path;
    return path.slice(prefix.length) || '/';
}

/** Navigate to path, automatically prefixing with the current locale segment. */
export function localeGoto(
    path: string,
    options?: GotoOptions,
): ReturnType<typeof goto> {
    const locale = (page.params as Record<string, string>).locale;
    const prefixed = locale ? `/${locale}${path === '/' ? '' : path}` : path;
    return goto(prefixed, options);
}
