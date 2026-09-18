import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for the locale cache-busting convention (see CLAUDE.md).
 *
 * `/locales/**` and `/updates.json` are served `Cache-Control: immutable` with a
 * one-year max-age (firebase.json), which is only safe because every request for
 * one carries a content hash appended by `versioned()`. A fetch that skips it
 * would pin stale text in a reader's cache for a year against a path whose
 * contents change several times a day, with no way out short of clearing site
 * data — a bug nobody would reproduce and nobody could diagnose.
 *
 * Two shapes are checked: a locale URL written inside the `fetch(...)` call, and
 * a local name assigned a locale URL and then fetched. A path arriving through a
 * method call is beyond a regex, so `versioned()` still has to be applied by
 * hand there; the two shapes below are the ones that have actually gone wrong.
 *
 * `functions/` is covered too, and it is why this comment exists: two Cloud
 * Functions fetch a locale over HTTP and cannot use `versioned()` at all, since
 * its table lives in the app bundle and `functions/` compiles as its own
 * package. They declare `Cache-Control: no-cache` on the request instead and
 * manage freshness with their own TTL, which is the only other way to be safe
 * under an `immutable` header. Scanning only `src/` let that go unnoticed.
 *
 * `static/scripts/locale-preload.js` is in scope for the same reason. It is the
 * *first* request for a locale on any non-English page, it cannot import
 * `versioned()` either (a static file served as-is), and it builds the `?v=`
 * itself from the hashes hooks.server.ts hands it — a third safe form, and one
 * nothing else would have caught.
 */
const VERSIONED = 'src/db/locales/versioned.ts';

/** A path under /locales/, or the changelog bundle the updates page reads. */
const LocaleAsset = /\/locales\/|\/updates\.json/;

/** Build-time Node tooling writes these files rather than fetching them over
 *  the network, so the browser cache rule does not reach it. */
const NotServedToBrowsers = 'src/util/verify-locales/';

function sourceFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...sourceFilesUnder(path));
        else if (entry.endsWith('.ts') || entry.endsWith('.svelte'))
            found.push(path);
    }
    return found;
}

/** The text between `fetch(` and its matching close paren. */
function fetchArguments(source: string): string[] {
    const args: string[] = [];
    const pattern = /\bfetch\(/g;
    let match = pattern.exec(source);
    while (match !== null) {
        let depth = 1;
        let index = match.index + match[0].length;
        const start = index;
        while (index < source.length && depth > 0) {
            const character = source[index];
            if (character === '(') depth += 1;
            else if (character === ')') depth -= 1;
            index += 1;
        }
        if (depth === 0) args.push(source.slice(start, index - 1));
        match = pattern.exec(source);
    }
    return args;
}

/**
 * The same text with comments removed.
 *
 * Without this the guard reads its own explanations: a comment inside a
 * `fetch(...)` call mentioning `versioned(` made the call look safe however it
 * actually behaved, which is exactly what happened the first time `functions/`
 * was brought into scope.
 */
function withoutComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/** The one non-TypeScript file that fetches a locale asset. */
const PreloadScript = 'static/scripts/locale-preload.js';

/** Names bound to a locale URL, so `fetch(name)` can be recognized as one. */
function localeUrlNames(source: string): Map<string, string> {
    const names = new Map<string, string>();
    const pattern =
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^;]*)/g;
    let match = pattern.exec(source);
    while (match !== null) {
        const [, name, value] = match;
        if (
            name !== undefined &&
            value !== undefined &&
            LocaleAsset.test(value)
        )
            names.set(name, value);
        match = pattern.exec(source);
    }
    return names;
}

function unversionedFetches(root: string): string[] {
    const offenders: string[] = [];
    for (const absolute of [
        ...sourceFilesUnder(resolve(root, 'src')),
        ...sourceFilesUnder(resolve(root, 'functions', 'src')),
        resolve(root, PreloadScript),
    ]) {
        const path = relative(root, absolute);
        if (
            path === VERSIONED ||
            path.endsWith('.test.ts') ||
            path.startsWith(NotServedToBrowsers)
        )
            continue;

        const source = readFileSync(absolute, 'utf-8');
        if (!LocaleAsset.test(source)) continue;
        const names = localeUrlNames(source);
        for (const raw of fetchArguments(source)) {
            const argument = withoutComments(raw);
            const name = argument.trim().replace(/,$/, '');
            const fetchesLocaleAsset =
                LocaleAsset.test(argument) || names.has(name);
            // Either carry a content hash, or tell caches not to keep it. A URL
            // built into a name carries its hash at the binding rather than at
            // the call, so ask the binding.
            const safe =
                argument.includes('versioned(') ||
                argument.includes("'Cache-Control': 'no-cache'") ||
                (names.get(name)?.includes('versioned(') ?? false) ||
                (names.get(name)?.includes("'?v='") ?? false);
            if (fetchesLocaleAsset && !safe)
                offenders.push(
                    `${path}: fetch(${argument.trim().slice(0, 60)})`,
                );
        }
    }
    return offenders.sort();
}

test('every fetch of a locale asset goes through versioned()', () => {
    expect(
        unversionedFetches(resolve(__dirname, '../../..')),
        `Locale asset fetched without a content hash. /locales/** is served immutable for a year (firebase.json), so an unversioned URL can pin stale text. Wrap the URL in versioned() from ${VERSIONED} — or, where that module cannot be imported (functions/ is its own package), send \`headers: { 'Cache-Control': 'no-cache' }\` and manage freshness with a TTL.`,
    ).toEqual([]);
});
