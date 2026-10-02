import Announcement from '#components/project/Announcement.ts';
import {
    markLanguage,
    toSpokenRuns,
    withoutLanguageMarks,
} from '#locale/spokenLanguage.ts';
import { describe, expect, test } from 'vitest';

describe('language marks', () => {
    test('untagged text is left alone', () => {
        expect(markLanguage('hola', undefined)).toBe('hola');
        expect(toSpokenRuns('new hola', 'en-US')).toBeUndefined();
    });

    test('a marked stretch becomes its own run', () => {
        const message = `new ${markLanguage('hola', 'es')}, 3`;
        expect(toSpokenRuns(message, 'en-US')).toEqual([
            { text: 'new ', language: 'en-US' },
            { text: 'hola', language: 'es' },
            { text: ', 3', language: 'en-US' },
        ]);
        expect(withoutLanguageMarks(message)).toBe('new hola, 3');
    });

    test('a mark in the base language needs no runs', () => {
        expect(
            toSpokenRuns(`new ${markLanguage('hi', 'en-US')}`, 'en-US'),
        ).toBeUndefined();
    });

    test('adjacent runs in one language merge', () => {
        const message = markLanguage('ho', 'es') + markLanguage('la', 'es');
        expect(toSpokenRuns(message, 'en-US')).toEqual([
            { text: 'hola', language: 'es' },
        ]);
    });

    test('an announcement reads without marks and keeps its runs', () => {
        const announcement = new Announcement(
            'stage-entered',
            'en-US',
            `new ${markLanguage('안녕', 'ko')}`,
        );
        expect(announcement.text).toBe('new 안녕');
        expect(announcement.runs?.map((r) => r.language)).toEqual([
            'en-US',
            'ko',
        ]);
    });
});
