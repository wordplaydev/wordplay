import { SupportedLocales } from '@locale/SupportedLocales';

const FIREBASE_PATTERNS: RegExp[] = [
    /^\/login(\/|$)/,
    /^\/projects(\/|$)/,
    /^\/galleries(\/|$)/,
    /^\/gallery\//,
    /^\/teach(\/|$)/,
    /^\/characters(\/|$)/,
    /^\/character\//,
    /^\/profile(\/|$)/,
    /^\/join(\/|$)/,
    /^\/moderate(\/|$)/,
];

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(SupportedLocales);

/** Strip the optional [[locale]] prefix (e.g. "/en-US/projects" → "/projects").
 *  A locale prefix may also be multiple locales joined by '+' (e.g. "en-US+es-MX"). */
function stripLocalePrefix(pathname: string): string {
    const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
    if (match === null) return pathname;
    const firstSegment = match[1];
    const rest = match[2] ?? '/';
    const localeParts = firstSegment.split('+');
    if (
        localeParts.length > 0 &&
        localeParts.every((part) => SUPPORTED_LOCALE_SET.has(part))
    )
        return rest;
    return pathname;
}

/** Returns true if the given route requires a Firebase connection to function.
 *  Pages that depend on Firebase (auth, project lists, galleries, etc.) should
 *  be locked when the connection is unavailable. The project editor and static
 *  pages remain interactive even when offline. */
export function routeRequiresFirebase(pathname: string): boolean {
    const stripped = stripLocalePrefix(pathname);
    return FIREBASE_PATTERNS.some((pattern) => pattern.test(stripped));
}
