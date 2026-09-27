import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { expect, test } from 'vitest';
import { FontsVersion } from './faces.generated';

/**
 * Guard for the font cache-busting convention (see CLAUDE.md).
 *
 * `/fonts/**` is served `Cache-Control: immutable` with a one-year max-age
 * (firebase.json), which is only safe because every URL for one carries the
 * content version `?v=` from scripts/fonts/version.ts. An unversioned URL would
 * pin a stale font — or a stylesheet declaring ranges a new font no longer has —
 * in a returning reader's cache for a year.
 *
 * Three places write font URLs: the page shell, the generated stylesheets, and
 * `getFontFileURL`, the only runtime builder. Any other literal `/fonts/` URL in
 * app code is refused, so new code has to go through `getFontFileURL`.
 */

/** A font URL: `/fonts/` up to the end of the URL, then whatever follows it. */
const FontURL = /(?<=["'`(])\/fonts\/[^"'`)\s?]+(\?v=[^"'`)\s]*)?/g;

/** The one runtime builder of a font path, which getFontFileURL versions. */
const PathBuilder = 'src/basis/faces/Fonts.ts';

function sourceFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...sourceFilesUnder(path));
        else if (
            /\.(ts|svelte|js)$/.test(entry) &&
            !/\.test\.ts$|\.generated\.ts$/.test(entry)
        )
            found.push(path);
    }
    return found;
}

function fontURLs(
    text: string,
): { url: string; version: string | undefined }[] {
    return [...text.matchAll(FontURL)].map((m) => ({
        url: m[0],
        version: m[1],
    }));
}

test('the page shell versions every font URL', () => {
    const urls = fontURLs(readFileSync('src/app.html', 'utf8'));
    expect(urls.length).toBeGreaterThan(0);
    expect(
        urls.filter((u) => u.version !== '?v=%wordplay.fontsversion%'),
    ).toEqual([]);
});

test.each(['static/fonts/fonts.css', 'static/fonts/fonts-fallback.css'])(
    '%s versions every font URL',
    (file) => {
        const urls = fontURLs(readFileSync(file, 'utf8'));
        expect(urls.length).toBeGreaterThan(0);
        expect(urls.filter((u) => u.version !== `?v=${FontsVersion}`)).toEqual(
            [],
        );
    },
);

test('app code builds font URLs only through getFontFileURL', () => {
    const strays = [
        ...sourceFilesUnder('src'),
        ...sourceFilesUnder('static/scripts'),
    ]
        .filter((file) => file !== PathBuilder)
        .flatMap((file) =>
            fontURLs(readFileSync(file, 'utf8')).map(
                (u) => `${file}: ${u.url}`,
            ),
        );
    expect(strays).toEqual([]);
});
