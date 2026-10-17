import { describe, expect, test } from 'vitest';
import { getNameWithShownWords } from './labelInName';

describe('getNameWithShownWords', () => {
    test.each([
        // Shown words the tip lacks lead the name.
        [
            'English',
            'choose language(s) for the website',
            'English, choose language(s) for the website',
        ],
        [
            'remove point',
            'remove the selected point',
            'remove point, remove the selected point',
        ],
        ['1', 'open notifications dialog', '1, open notifications dialog'],
        [
            '日本語',
            'ウェブサイトの言語を選ぶ',
            '日本語, ウェブサイトの言語を選ぶ',
        ],
        // A tip that already contains them, in any case or punctuation, is left alone.
        ['start', 'hide source start', 'hide source start'],
        [
            'Share',
            'show project sharing options, or share',
            'show project sharing options, or share',
        ],
        // A word inside a longer word is not the word.
        ['art', 'hide source start', 'art, hide source start'],
        // Nothing shown, or nothing to describe it, leaves the other.
        ['', 'open notifications dialog', 'open notifications dialog'],
        ['Join', '', 'Join'],
    ])('%s + %s', (shown, tip, name) =>
        expect(getNameWithShownWords(shown, tip)).toBe(name),
    );
});
