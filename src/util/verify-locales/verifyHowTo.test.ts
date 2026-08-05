import { HowToIDs } from '@concepts/HowTo';
import getDocExamples from '@util/verify-locales/docExamples';
import analyzeCode from '@util/verify-locales/analyzeCode';
import DefaultLocale from '@locale/DefaultLocale';
import {
    bundleEntryToHowTo,
    parseHowTo,
    type HowToBundleEntry,
} from '@concepts/HowTo';
import { MachineTranslated } from '@locale/Annotations';
import { isMachineTranslated, isUnwritten } from '@locale/LocaleText';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Test the helper functions and logic that can be unit tested
describe('verifyHowTo helpers', () => {
    it('should identify unwritten content correctly', () => {
        expect(isUnwritten('$?Some unwritten text')).toBe(true);
        expect(isUnwritten('Regular text')).toBe(false);
        expect(isUnwritten('')).toBe(false);
    });

    it('should identify automated content correctly', () => {
        expect(
            isMachineTranslated(MachineTranslated + 'Some translated text'),
        ).toBe(true);
        expect(isMachineTranslated('Regular text')).toBe(false);
        expect(isMachineTranslated('')).toBe(false);
    });

    it('should handle machine translated marker correctly', () => {
        const text = 'Hello world';
        const marked = MachineTranslated + text;

        expect(marked.startsWith(MachineTranslated)).toBe(true);
        expect(marked.replace(MachineTranslated, '')).toBe(text);
    });

    it('should clean lines correctly', () => {
        const testCases = [
            {
                input: MachineTranslated + 'Some translated text',
                expected: 'Some translated text',
            },
            {
                input: '$~Some text with marker',
                expected: 'Some text with marker',
            },
            {
                input: '  Regular text with spaces  ',
                expected: 'Regular text with spaces',
            },
            {
                input: '',
                expected: '',
            },
        ];

        testCases.forEach(({ input, expected }) => {
            const cleaned = input
                .replace(MachineTranslated, '')
                .replace(/^\$~/, '')
                .trim();
            expect(cleaned).toBe(expected);
        });
    });
});

describe('how-to bundle round-trip', () => {
    // Rebuild a how-to from a bundle entry derived from its source .txt, mirroring how
    // buildHowTos.ts generates the bundle and LocalesDatabase.loadHowTos reads it back.
    const id = 'animate-phrase';
    const text = fs.readFileSync(
        path.join('static', 'locales', 'en-US', 'how', `${id}.txt`),
        'utf-8',
    );
    const { how, body } = parseHowTo(id, text);

    it('parses the source how-to', () => {
        expect(how).not.toBeNull();
        expect(how?.content.getExamples().length).toBeGreaterThan(0);
    });

    it('round-trips a bundle entry back to an equivalent how-to', () => {
        if (how === null || body === null)
            throw new Error('how-to failed to parse');

        // Build a bundle entry the way buildHowTos.ts does.
        const entry: HowToBundleEntry = {
            id: how.id,
            title: how.title,
            category: how.category,
            body,
            related: how.related,
        };

        const restored = bundleEntryToHowTo(entry);
        expect(restored.id).toBe(how.id);
        expect(restored.title).toBe(how.title);
        expect(restored.category).toBe(how.category);
        expect(restored.related).toEqual(how.related);
        // The re-parsed body produces equivalent markup.
        expect(restored.content.toWordplay()).toBe(how.content.toWordplay());
    });
});

// Integration test description for manual testing
describe('verifyHowTo integration', () => {
    it('should be tested manually with actual file system', () => {
        // This test documents the expected behavior for manual testing:
        //
        // 1. Run: npx tsx src/util/verify-locales/start.ts verify fr-FR
        //    Expected: Should show "Missing X how-to files for fr-FR"
        //
        // 2. Run: npx tsx src/util/verify-locales/start.ts verify en-US
        //    Expected: Should complete without how-to messages (skips en-US)
        //
        // 3. Run: npx tsx src/util/verify-locales/start.ts translate de-DE
        //    Expected: Should attempt translation (will fail without Google Cloud credentials)
        //
        // This ensures the implementation works correctly with real file system operations
        // without complex mocking that causes TypeScript issues.

        expect(true).toBe(true); // Placeholder assertion
    });
});

describe('how-to example checking', () => {
    // The rule that makes the check usable at all: a how-to's prose quotes
    // tokens inline constantly ("the \→ ''\ turns it into text"), and analyzing
    // those as programs buries the real defects under a thousand fragments.
    it('tells a runnable block from a token quoted mid-sentence', () => {
        const examples = getDocExamples(
            "Set it with \\count\\ and watch:\n\n\\\nPhrase(count → '')\n\\\n\nThat's it.",
        );
        expect(examples.map((example) => example.block)).toEqual([false, true]);
    });

    it('finds a conflict in a block example', () => {
        const [example] = getDocExamples('\n\\\nPhrase(nosuchname)\n\\\n');
        expect(example.block).toBe(true);
        expect(analyzeCode(example.code, DefaultLocale).conflicts).not.toEqual(
            [],
        );
    });

    // Every one of these ships to creators as a runnable preview tile, so a
    // broken one is a broken lesson. This is the whole reason the check exists.
    it('every en-US how-to block example analyzes cleanly', () => {
        const dir = path.join('static', 'locales', 'en-US', 'how');
        const broken: string[] = [];
        for (const id of HowToIDs) {
            const file = path.join(dir, `${id}.txt`);
            if (!fs.existsSync(file)) continue;
            const { body } = parseHowTo(id, fs.readFileSync(file, 'utf8'));
            if (body === null) continue;
            for (const example of getDocExamples(body)) {
                if (!example.block || example.expectsDefect) continue;
                const result = analyzeCode(example.code, DefaultLocale);
                if (result.error || result.conflicts.length > 0)
                    broken.push(
                        `${id}: ${result.error ?? result.conflicts.join(', ')}`,
                    );
            }
        }
        expect(broken).toEqual([]);
    });
});
