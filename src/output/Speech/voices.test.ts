import { describe, expect, test } from 'vitest';
import {
    chooseVoice,
    primarySubtag,
    type VoiceOption,
} from '@output/Speech/voices';

const Voices: VoiceOption[] = [
    { lang: 'en-US', uri: 'urn:samantha' },
    { lang: 'en-GB', uri: 'urn:daniel' },
    { lang: 'ja-JP', uri: 'urn:kyoko' },
];

describe('primarySubtag', () => {
    test('takes the primary subtag, lowercased', () => {
        expect(primarySubtag('en-GB')).toBe('en');
        expect(primarySubtag('EN')).toBe('en');
        expect(primarySubtag('ja_JP')).toBe('ja');
    });

    test('is undefined for nothing and for an empty tag', () => {
        expect(primarySubtag(undefined)).toBeUndefined();
        expect(primarySubtag('')).toBeUndefined();
    });
});

describe('chooseVoice', () => {
    test('no pinned voice lets the engine choose from the language', () => {
        expect(chooseVoice(Voices, undefined, 'en-US')).toBeUndefined();
    });

    test('the pinned voice wins when the utterance has no language of its own', () => {
        expect(chooseVoice(Voices, 'urn:samantha', undefined)?.uri).toBe(
            'urn:samantha',
        );
    });

    test('the pinned voice wins across regions of the same language', () => {
        // An American voice reading British English is a preference, not a
        // failure, so region is not compared.
        expect(chooseVoice(Voices, 'urn:samantha', 'en-GB')?.uri).toBe(
            'urn:samantha',
        );
    });

    test('a pinned voice of the wrong language is dropped', () => {
        // The regression this exists for: engines speak in the voice's own
        // language, so an English voice on Japanese text reads as gibberish.
        expect(chooseVoice(Voices, 'urn:samantha', 'ja-JP')).toBeUndefined();
    });

    test('a pin the device no longer offers is dropped', () => {
        expect(chooseVoice(Voices, 'urn:gone', 'en-US')).toBeUndefined();
    });

    test('a device with no voices at all chooses none', () => {
        expect(chooseVoice([], 'urn:samantha', 'en-US')).toBeUndefined();
    });
});

describe('a novelty default is not what a lesson is read in', () => {
    // As Chromium lists them on macOS: the novelty voice Albert flagged default.
    const Chromium: VoiceOption[] = [
        {
            lang: 'en-US',
            uri: 'albert',
            name: 'Albert (English (United States))',
            default: true,
            local: true,
        },
        { lang: 'en-US', uri: 'bubbles', name: 'Bubbles', local: true },
        { lang: 'en-US', uri: 'network', name: 'Google US English' },
        { lang: 'en-US', uri: 'samantha', name: 'Samantha', local: true },
        {
            lang: 'en-US',
            uri: 'ava',
            name: 'Ava (Enhanced)',
            local: true,
        },
        { lang: 'ja-JP', uri: 'kyoko', name: 'Kyoko', local: true },
    ];

    test('an enhanced voice in the language comes first', () => {
        expect(chooseVoice(Chromium, undefined, 'en-US')?.uri).toBe('ava');
    });

    test('otherwise a voice on the device', () => {
        const plain = Chromium.filter((voice) => voice.uri !== 'ava');
        expect(chooseVoice(plain, undefined, 'en-US')?.uri).toBe('samantha');
    });

    test('an ordinary default is left to the engine', () => {
        // Safari's case, which already follows the system voice.
        const safari = Chromium.map((voice) => ({
            ...voice,
            default: voice.uri === 'samantha',
        }));
        expect(chooseVoice(safari, undefined, 'en-US')).toBeUndefined();
    });

    test('another language is not affected', () => {
        expect(chooseVoice(Chromium, undefined, 'ja-JP')).toBeUndefined();
    });

    test('a pinned voice still wins, even a novelty one', () => {
        expect(chooseVoice(Chromium, 'bubbles', 'en-US')?.uri).toBe('bubbles');
    });

    test('a pinned voice in another language falls back past the novelty', () => {
        expect(chooseVoice(Chromium, 'kyoko', 'en-US')?.uri).toBe('ava');
    });
});
