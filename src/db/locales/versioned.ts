import { version } from '$app/environment';

/**
 * Append the SvelteKit build version as a cache-bust query param.
 *
 * Static locale files under /locales/ are not content-hashed, so browsers/CDN can
 * serve a copy cached from an older deploy against newer (hashed, immutable) JS —
 * causing version skew where the new code reads keys the stale JSON lacks. Tying the
 * URL to the running build forces a fresh fetch whenever the bundle changes.
 */
export default function versioned(path: string): string {
    return `${path}?v=${encodeURIComponent(version)}`;
}
