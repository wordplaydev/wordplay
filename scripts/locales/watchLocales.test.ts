import path from 'node:path';
import { expect, test } from 'vitest';
import {
    fetchedLocaleOf,
    isTutorial,
    sectionLocaleOf,
} from './watchLocales.ts';

/** Paths arrive from the watcher in the platform's own separator. */
function at(...parts: string[]): string {
    return parts.join(path.sep);
}

test.each([
    // en-US is the asymmetry: its sections are under src/locale/, singular. The plugin
    // this replaced tested for the substring "locales" and so never matched any of them.
    [at('src', 'locale', 'en-US', 'sections', 'ui.json'), 'en-US'],
    [at('static', 'locales', 'ja-JP', 'sections', 'node.json'), 'ja-JP'],
    // A locale code contains hyphens, which is why nothing here parses a file name.
    [
        at('static', 'locales', 'ta-IN-LK-SG', 'sections', 'locale.json'),
        'ta-IN-LK-SG',
    ],
])('%s is a section of %s', (file, locale) => {
    expect(sectionLocaleOf(file)).toBe(locale);
});

test.each([
    // What the plugin writes. Reacting to its own output is what made every rebuild
    // announce itself twice.
    [at('src', 'locale', 'en-US.json')],
    [at('static', 'locales', 'ja-JP', 'ja-JP.json')],
    // Not a section, however deep.
    [at('static', 'locales', 'ja-JP', 'ja-JP-tutorial.json')],
    [at('static', 'locales', 'en-US', 'how', 'animate-phrase.txt')],
    // A nested directory under sections/ is not a section file.
    [at('static', 'locales', 'ja-JP', 'sections', 'nested', 'ui.json')],
    // Nothing to do with locales at all.
    [at('src', 'components', 'app', 'Page.svelte')],
    [at('static', 'locales', 'names.json')],
])('%s is not a section', (file) => {
    expect(sectionLocaleOf(file)).toBeUndefined();
});

test.each([
    [at('static', 'locales', 'ja-JP', 'ja-JP-tutorial.json'), 'ja-JP'],
    [at('static', 'locales', 'ja-JP', 'ja-JP-tutorial-quick.json'), 'ja-JP'],
    [at('static', 'locales', 'en-US', 'how', 'animate-phrase.txt'), 'en-US'],
    [at('static', 'locales', 'ko-KR', 'ko-KR-emojis.json'), 'ko-KR'],
])('%s is fetched content of %s', (file, locale) => {
    expect(fetchedLocaleOf(file)).toBe(locale);
});

test.each([
    // The assembled document is this plugin's own output, not something to announce.
    [at('static', 'locales', 'ja-JP', 'ja-JP.json')],
    [at('static', 'locales', 'ta-IN-LK-SG', 'ta-IN-LK-SG.json')],
    // Sections are the other branch's business.
    [at('static', 'locales', 'ja-JP', 'sections', 'ui.json')],
    // en-US's assembly lives outside static/locales entirely.
    [at('src', 'locale', 'en-US.json')],
    // The name index is not per-locale.
    [at('static', 'locales', 'names.json')],
    [at('static', 'updates.json')],
])('%s is not fetched per-locale content', (file) => {
    expect(fetchedLocaleOf(file)).toBeUndefined();
});

test.each([
    // A tutorial is the one fetched bundle whose cache can be invalidated in place, so it
    // is the only one that does not cost the page's state.
    [at('static', 'locales', 'ja-JP', 'ja-JP-tutorial.json'), true],
    [at('static', 'locales', 'ja-JP', 'ja-JP-tutorial-quick.json'), true],
    [at('static', 'locales', 'ta-IN-LK-SG', 'ta-IN-LK-SG-tutorial.json'), true],
    // These have no refresh path, so they reload instead.
    [at('static', 'locales', 'en-US', 'how', 'animate-phrase.txt'), false],
    [at('static', 'locales', 'ko-KR', 'ko-KR-emojis.json'), false],
    [at('static', 'locales', 'ko-KR', 'ko-KR-updates.json'), false],
])('%s is a tutorial: %s', (file, tutorial) => {
    expect(isTutorial(file)).toBe(tutorial);
});
