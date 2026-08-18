import {
    buildManifest,
    type ManifestSource,
} from '@util/verify-locales/generateManifests';
import { expect, test } from 'vitest';

/** State a case as just the fields a manifest is built from. */
function locale(options: {
    language: ManifestSource['language'];
    regions: ManifestSource['regions'];
    word?: string;
    description?: string;
}): ManifestSource {
    return {
        language: options.language,
        regions: options.regions,
        glossary: { wordplay: { word: options.word } },
        system: { appDescription: options.description },
    };
}

const English = locale({
    language: 'en',
    regions: ['US'],
    word: 'Wordplay',
    description: 'Programmable typography.',
});

test('names the app in the locale, and launches into it', () => {
    const manifest = buildManifest(
        locale({
            language: 'es',
            regions: ['MX'],
            word: 'Juego de palabras',
            description: 'Tipografía programable.',
        }),
        English,
    );
    expect(manifest.name).toBe('Juego de palabras');
    expect(manifest.short_name).toBe('Juego de palabras');
    expect(manifest.description).toBe('Tipografía programable.');
    expect(manifest.lang).toBe('es');
    expect(manifest.start_url).toBe('/es-MX');
});

test('every locale shares one id, so installs are one app rather than thirty', () => {
    expect(buildManifest(English, English).id).toBe(
        buildManifest(
            locale({ language: 'ko', regions: ['KR'], word: '워드플레이' }),
            English,
        ).id,
    );
});

test('carries the script’s direction, so an RTL name renders as written', () => {
    expect(
        buildManifest(locale({ language: 'ar', regions: ['SA'] }), English).dir,
    ).toBe('rtl');
    expect(buildManifest(English, English).dir).toBe('ltr');
});

test('falls back to English rather than installing a nameless app', () => {
    // An unwritten string is a bare `$?`, which strips to nothing at all.
    const manifest = buildManifest(
        locale({
            language: 'ne',
            regions: ['NP'],
            word: '$?',
            description: '$?',
        }),
        English,
    );
    expect(manifest.name).toBe('Wordplay');
    expect(manifest.description).toBe('Programmable typography.');
});

test('names multi-region locales by language, since their code is not a language tag', () => {
    const manifest = buildManifest(
        locale({
            language: 'ta',
            regions: ['IN', 'LK', 'SG'],
            word: 'Wordplay',
        }),
        English,
    );
    expect(manifest.lang).toBe('ta');
    expect(manifest.start_url).toBe('/ta-IN-LK-SG');
});
