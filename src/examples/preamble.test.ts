import { describe, expect, test } from 'vitest';
import { parseSerializedProject } from './examples';
import { parsePreamble, serializePreamble, type Preamble } from './preamble';
import { serializeExample } from './serializeExample';

describe('parsePreamble', () => {
    test('reads nothing from a file that declares nothing', () => {
        // The overwhelmingly common case: every example and every kit.
        expect(parsePreamble(['=== start/en', '1 + 1'])).toEqual({
            preamble: {},
            end: 0,
        });
    });

    test('reads the locales a project declares', () => {
        expect(parsePreamble(['@locales en-US es-MX', '=== start'])).toEqual({
            preamble: { locales: ['en-US', 'es-MX'] },
            end: 1,
        });
    });

    test('reads a pinned preview', () => {
        expect(parsePreamble(['@preview manual', '=== start'])).toEqual({
            preamble: { preview: 'manual' },
            end: 1,
        });
    });

    test('ignores a key it has never heard of', () => {
        // This, rather than a version number, is what lets a file written by a
        // later Wordplay still open here.
        const { preamble, end } = parsePreamble([
            '@locales en-US',
            '@somethingnew whatever it says',
            '@preview manual',
            '=== start',
        ]);
        expect(preamble).toEqual({ locales: ['en-US'], preview: 'manual' });
        // Counted, so the unknown line is still peeled off rather than left to
        // become a phantom source.
        expect(end).toBe(3);
    });

    test('stops at the first line that is not preamble', () => {
        // Never scans ahead: a creator's own prose beginning with @ further
        // down the file is not metadata.
        expect(
            parsePreamble(['@locales en-US', '=== start', '@notmetadata here']),
        ).toEqual({ preamble: { locales: ['en-US'] }, end: 1 });
    });

    test('refuses shapes that only look like preamble', () => {
        // An uppercase concept link, a bare word, and an indented line are all
        // ordinary text.
        for (const line of ['@Phrase', ' @locales en-US', '@', 'locales en-US'])
            expect(parsePreamble([line]).end).toBe(0);
    });

    test('treats an empty value as nothing said', () => {
        // A line with nothing on it is not a declaration that there are no
        // locales; deriving from the headers is the better answer.
        expect(parsePreamble(['@locales   ']).preamble).toEqual({});
        expect(parsePreamble(['@preview']).preamble).toEqual({});
    });

    test('ignores a preview mode it does not pin', () => {
        // `auto` is what a file with no preview line already means, so saying
        // it changes nothing.
        expect(parsePreamble(['@preview auto']).preamble).toEqual({});
    });
});

describe('serializePreamble', () => {
    test('writes nothing when there is nothing to say', () => {
        expect(serializePreamble({})).toBe('');
        expect(serializePreamble({ preview: 'auto' })).toBe('');
        expect(serializePreamble({ locales: [] })).toBe('');
    });

    test('writes a fixed order, so two exports agree byte for byte', () => {
        expect(
            serializePreamble({ preview: 'manual', locales: ['en-US', 'fr'] }),
        ).toBe('@locales en-US fr\n@preview manual\n');
    });
});

describe('a file carrying a preamble', () => {
    const preamble: Preamble = {
        locales: ['es-MX', 'en-US'],
        preview: 'manual',
    };
    const sources = [{ names: 'start/en', code: "Phrase('hi')\n" }];

    test('round-trips through the parser and back', () => {
        const text = serializeExample('🐈', '"Cat"/en', sources, preamble);
        expect(text).toBe(
            '🐈\n"Cat"/en\n@locales es-MX en-US\n@preview manual\n=== start/en\nPhrase(\'hi\')\n',
        );
        const parsed = parseSerializedProject(text, 'x');
        expect(parsed.name).toBe('"Cat"/en');
        expect(parsed.sources).toEqual([
            { names: 'start/en', code: "Phrase('hi')\n", caret: 0 },
        ]);
    });

    test('keeps the preamble out of the sources', () => {
        // The hazard this position carries: an unpeeled preamble becomes a
        // phantom source at index 0, and index 0 is the project's main source.
        const text = serializeExample('🐈', 'Cat', sources, preamble);
        const parsed = parseSerializedProject(text, 'x');
        expect(parsed.sources).toHaveLength(1);
        expect(parsed.sources[0]?.names).toBe('start/en');
    });

    test('declares its locales rather than deriving them', () => {
        // The source header says `/en`, but the project declares es-MX first.
        const text = serializeExample('🐈', 'Cat', sources, preamble);
        expect(parseSerializedProject(text, 'x').locales).toEqual([
            'es-MX',
            'en-US',
        ]);
    });

    test('still lets the caller override the declaration', () => {
        // A per-locale example is told what it is; that beats the file.
        const text = serializeExample('🐈', 'Cat', sources, preamble);
        expect(parseSerializedProject(text, 'x', ['fr-FR']).locales).toEqual([
            'fr-FR',
        ]);
    });

    test('derives locales when the file declares none', () => {
        const text = serializeExample('🐈', 'Cat', sources);
        expect(parseSerializedProject(text, 'x').locales).toEqual(['en']);
    });

    test('keeps a pinned preview pinned', () => {
        // Without this a creator's chosen glyph becomes recomputable, and the
        // first render overwrites it.
        const text = serializeExample('🐈', 'Cat', sources, preamble);
        expect(parseSerializedProject(text, 'x').preview?.mode).toBe('manual');
        const auto = serializeExample('🐈', 'Cat', sources);
        expect(parseSerializedProject(auto, 'x').preview?.mode).toBe('auto');
    });
});
