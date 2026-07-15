/**
 * Extract a trailing route id (project, character, gallery, …) from a page URL.
 *
 * Parses the pathname so query params and hashes are stripped — the project
 * route now persists the evaluation mode as `?mode=edit`, and a naive
 * `url.split('/').pop()` would otherwise capture `id?mode=edit` and every
 * downstream Firestore lookup would miss.
 */
export function idFromURL(url: string): string {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] as string;
}
