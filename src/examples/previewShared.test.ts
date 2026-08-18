import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import {
    buildSitemapXml,
    injectPreviewHead,
    parsePreviewPath,
    parseWpProjectName,
    pickLocalizedText,
    resolveMultilingualName,
} from '../../functions/src/preview/shared';

/** The real shell head shapes: if app.html's meta tags change form, the
 *  preview function's string surgery must be revisited, so test against it. */
const shell = readFileSync(path.join('src', 'app.html'), 'utf8');

test('injectPreviewHead inserts a title and replaces og tags', () => {
    const html = injectPreviewHead(shell, {
        title: 'Heart Attack',
        description: 'A game about love.',
        url: 'https://wordplay.dev/project/example-HeartAttack',
    });
    expect(html).toContain('<title>Heart Attack</title>');
    expect(html).toContain(
        '<meta name="title" property="og:title" content="Heart Attack" />',
    );
    expect(html).toContain(
        '<meta name="description" property="og:description" content="A game about love." />',
    );
    expect(html).toContain(
        '<meta property="og:url" content="https://wordplay.dev/project/example-HeartAttack" />',
    );
    // The original title/description/url contents are gone.
    expect(html).not.toContain(
        'Accessible, Multilingual, Programmable Typography',
    );
    // One tag each, not duplicates a scraper could pick arbitrarily.
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/property="og:description"/g)).toHaveLength(1);
});

test('injectPreviewHead escapes hostile names', () => {
    const html = injectPreviewHead(shell, {
        title: '</title><script>alert(1)</script>',
        description: '"/><script>alert(2)</script>',
        url: 'https://wordplay.dev/project/x',
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;/title&gt;');
});

test('injectPreviewHead replaces an existing title', () => {
    const withTitle = shell.replace(
        '</head>',
        '<title>Wordplay</title></head>',
    );
    const html = injectPreviewHead(withTitle, {
        title: 'Games',
        url: 'https://wordplay.dev/gallery/Games',
    });
    expect(html).toContain('<title>Games</title>');
    expect(html).not.toContain('<title>Wordplay</title>');
});

test('parsePreviewPath handles locale prefixes and rejects other routes', () => {
    expect(parsePreviewPath('/project/abc')).toEqual({
        kind: 'project',
        id: 'abc',
        locales: [],
    });
    expect(parsePreviewPath('/en-US+es-MX/gallery/Games')).toEqual({
        kind: 'gallery',
        id: 'Games',
        locales: ['en-US', 'es-MX'],
    });
    expect(parsePreviewPath('/gallery/G%C3%A9nial')?.id).toBe('Génial');
    expect(parsePreviewPath('/projects')).toBeUndefined();
    expect(parsePreviewPath('/en-US/projects')).toBeUndefined();
    expect(parsePreviewPath('/project/')).toBeUndefined();
    expect(parsePreviewPath('/a/b/c/d')).toBeUndefined();
    expect(parsePreviewPath('/project/%E0%A4%A')).toBeUndefined();
});

test('resolveMultilingualName picks the preferred translation', () => {
    expect(resolveMultilingualName('"Heart Attack"/en', ['en'])).toBe(
        'Heart Attack',
    );
    expect(resolveMultilingualName('"project"/en"proyecto"/es', ['es'])).toBe(
        'proyecto',
    );
    expect(resolveMultilingualName('"project"/en"proyecto"/es', ['fr'])).toBe(
        'project',
    );
    // Anything that isn't a clean end-to-end multilingual literal renders raw.
    expect(resolveMultilingualName('Adventure', ['en'])).toBe('Adventure');
    expect(resolveMultilingualName('"unterminated', ['en'])).toBe(
        '"unterminated',
    );
    expect(resolveMultilingualName('"a"/en trailing', ['en'])).toBe(
        '"a"/en trailing',
    );
    expect(resolveMultilingualName('"a"/en"b"', ['en'])).toBe('"a"/en"b"');
});

test('parseWpProjectName peels a preview glyph line', () => {
    expect(parseWpProjectName('🧟\n"Heart Attack"/en\n=== start/en')).toBe(
        '"Heart Attack"/en',
    );
    // A keycap glyph is multiple code points but one grapheme.
    expect(parseWpProjectName('0⃣\nCalculator\n=== main')).toBe('Calculator');
    // Legacy files have no glyph line.
    expect(parseWpProjectName('Maze\n=== main')).toBe('Maze');
    expect(parseWpProjectName('')).toBeUndefined();
});

test('pickLocalizedText falls back by language, then en-US, skipping unwritten strings', () => {
    const record = {
        'en-US': 'Games',
        'es-MX': 'Juegos',
        'fr-FR': '$?',
    };
    expect(pickLocalizedText(record, ['es-MX'])).toBe('Juegos');
    expect(pickLocalizedText(record, ['es-ES'])).toBe('Juegos');
    expect(pickLocalizedText(record, ['fr-FR'])).toBe('Games');
    expect(pickLocalizedText(record, [])).toBe('Games');
    expect(pickLocalizedText({ 'fr-FR': '$?' }, ['fr-FR'])).toBeUndefined();
    expect(pickLocalizedText(undefined, ['en-US'])).toBeUndefined();
});

test('buildSitemapXml escapes URLs', () => {
    const xml = buildSitemapXml(['https://wordplay.dev/project/a&b']);
    expect(xml).toContain('<loc>https://wordplay.dev/project/a&amp;b</loc>');
    expect(xml).toContain('<urlset');
});
