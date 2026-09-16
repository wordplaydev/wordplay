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

/** Names bound to a locale URL, so `fetch(name)` can be recognized as one. */
function localeUrlNames(source: string): Set<string> {
    const names = new Set<string>();
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
            names.add(name);
        match = pattern.exec(source);
    }
    return names;
}

function unversionedFetches(root: string): string[] {
    const offenders: string[] = [];
    for (const absolute of sourceFilesUnder(resolve(root, 'src'))) {
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
        for (const argument of fetchArguments(source)) {
            const fetchesLocaleAsset =
                LocaleAsset.test(argument) ||
                names.has(argument.trim().replace(/,$/, ''));
            if (fetchesLocaleAsset && !argument.includes('versioned('))
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
        `Locale asset fetched without versioned(). /locales/** is served immutable for a year (firebase.json), so an unversioned URL pins stale text in every reader's cache. Wrap the URL in versioned() from ${VERSIONED}.`,
    ).toEqual([]);
});
