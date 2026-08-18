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
