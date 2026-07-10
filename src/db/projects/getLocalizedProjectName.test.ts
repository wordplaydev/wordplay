import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import { readFileSync } from 'fs';
import { describe, expect, test } from 'vitest';

import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import {
    getLocalizedProjectName,
    getProjectNameCount,
    parseAsMultilingualName,
    validateProjectName,
} from './getLocalizedProjectName';

const en = DefaultLocale;
const es = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
) as LocaleText;

function makeLocales(order: LocaleText[]): Locales {
    return new Locales(concretize, order, DefaultLocale);
}

function makeProject(name: string): Project {
    return Project.make(null, name, new Source('main', ''), [], DefaultLocale);
}

describe('getLocalizedProjectName', () => {
    test('plain names round-trip across any locale', () => {
        const project = makeProject('Adventure');
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe(
            'Adventure',
        );
        expect(getLocalizedProjectName(project, makeLocales([es]))).toBe(
            'Adventure',
        );
        expect(getLocalizedProjectName(project, makeLocales([es, en]))).toBe(
            'Adventure',
        );
    });

    test('empty name → empty string', () => {
        const project = makeProject('');
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe('');
    });

    test('multilingual TextLiteral picks the current locale', () => {
        const project = makeProject('"hi"/en"hola"/es');
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe('hi');
        expect(getLocalizedProjectName(project, makeLocales([es]))).toBe(
            'hola',
        );
        expect(getLocalizedProjectName(project, makeLocales([es, en]))).toBe(
            'hola',
        );
    });

    test('falls through to source-order tail when no preferred match', () => {
        // Active locale is es, but the multilingual name only has /en and /fr
        // tags. The getPreferred ladder falls through to source order,
        // returning the first translation.
        const project = makeProject('"bonjour"/fr"hi"/en');
        // With the default fallback (en) appended automatically, "hi"/en
        // becomes the language-only match, so it wins.
        expect(getLocalizedProjectName(project, makeLocales([es]))).toBe('hi');
    });

    test('malformed multilingual name returns raw string', () => {
        // Missing close quote on the first translation — parser recovers
        // but the structure isn't a clean TextLiteral.
        const raw = '"hi/en"hola"/es';
        const project = makeProject(raw);
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe(raw);
        expect(getLocalizedProjectName(project, makeLocales([es]))).toBe(raw);
    });

    test('expression that is not a TextLiteral returns raw string', () => {
        const project = makeProject('5 + 3');
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe(
            '5 + 3',
        );
    });

    test('quoted single translation without language tag returns raw', () => {
        // `"hello"` parses as a TextLiteral with one Translation but no
        // language tag — that's not multilingual; we render the raw quoted
        // string so the user sees what they typed.
        const project = makeProject('"hello"');
        expect(getLocalizedProjectName(project, makeLocales([en]))).toBe(
            '"hello"',
        );
    });
});

describe('parseAsMultilingualName', () => {
    test('returns the TextLiteral for well-formed input', () => {
        const result = parseAsMultilingualName('"hi"/en"hola"/es');
        expect(result).toBeDefined();
        expect(result?.texts).toHaveLength(2);
    });

    test('returns undefined for plain names', () => {
        expect(parseAsMultilingualName('Adventure')).toBeUndefined();
        expect(parseAsMultilingualName('')).toBeUndefined();
    });

    test('returns undefined for malformed multilingual input', () => {
        expect(parseAsMultilingualName('"hi/en"hola"/es')).toBeUndefined();
        // Trailing garbage:
        expect(
            parseAsMultilingualName('"hi"/en"hola"/es extra'),
        ).toBeUndefined();
        // Missing language tag on second translation:
        expect(parseAsMultilingualName('"hi"/en"hola"')).toBeUndefined();
    });
});

describe('getProjectNameCount', () => {
    test('empty name → 0', () => {
        expect(getProjectNameCount('')).toBe(0);
    });

    test('plain or single-quoted name → 1', () => {
        expect(getProjectNameCount('Adventure')).toBe(1);
        expect(getProjectNameCount('"hello"')).toBe(1);
        // A single language-tagged translation is one name.
        expect(getProjectNameCount('"hi"/en')).toBe(1);
    });

    test('multilingual literal → translation count', () => {
        expect(getProjectNameCount('"hi"/en"hola"/es')).toBe(2);
        expect(getProjectNameCount('"hi"/en"hola"/es"bonjour"/fr')).toBe(3);
    });

    test('malformed multilingual input counts as a single raw name', () => {
        expect(getProjectNameCount('"hi/en"hola"/es')).toBe(1);
    });
});

describe('validateProjectName', () => {
    test('plain names are always valid', () => {
        expect(validateProjectName('Adventure')).toBe(true);
        expect(validateProjectName('')).toBe(true);
        expect(validateProjectName('5 + 3')).toBe(true);
    });

    test('well-formed multilingual names are valid', () => {
        expect(validateProjectName('"hi"/en"hola"/es')).toBe(true);
        expect(validateProjectName('"hi"/en')).toBe(true);
    });

    test('malformed multilingual names return an error accessor', () => {
        // Missing close quote — looks like a TextLiteral attempt but
        // doesn't parse cleanly.
        const result1 = validateProjectName('"hi/en"hola"/es');
        expect(typeof result1).toBe('function');
        // Missing language tag on the second translation.
        const result2 = validateProjectName('"hi"/en"hola"');
        expect(typeof result2).toBe('function');
    });
});
