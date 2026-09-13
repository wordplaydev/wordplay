/**
 * The canonical origin, derived from the project rather than request headers:
 * header-derived origins would be attacker-controlled text in emitted HTML,
 * and a wrong guess could make a shell fetch recurse into the very function
 * that made it.
 *
 * Deliberately a module with no imports at all. Anything a root-side test or
 * script reaches — `scripts/emails/`, the email modules — joins `svelte-check`'s
 * program along with its whole static import cone, and `import type` still
 * needs module resolution there. This lived in `getPagePreview.ts`, which type
 * imports `firebase-functions`, a package the root `npm ci` never installs.
 */
export function canonicalOrigin(): string {
    if (process.env.FUNCTIONS_EMULATOR === 'true')
        return process.env.WORDPLAY_HOSTING_ORIGIN ?? 'http://127.0.0.1:5002';
    return process.env.GCLOUD_PROJECT === 'wordplay-prod'
        ? 'https://wordplay.dev'
        : 'https://test.wordplay.dev';
}
