import { expect, test } from 'vitest';
import firstSentence from '@locale/firstSentence';

test.each([
    // Ordinary sentence ends still end sentences.
    ['One. Two.', 'One.'],
    ['Wow! Then more.', 'Wow!'],
    ['No terminator here', 'No terminator here'],
    // ICU treats `!` as a sentence end, so `!#` — the not-a-number literal —
    // used to cut a doc off mid-sentence and drop everything after it.
    ['A value shows up as !# here. Then more.', 'A value shows up as !# here.'],
    ['shows up as !#: and more.', 'shows up as !#: and more.'],
    ['ends with !#', 'ends with !#'],
    // A `#` on its own was never the problem.
    ['A number # here. Then more.', 'A number # here.'],
])('first sentence of "%s" is "%s"', (text, expected) => {
    expect(firstSentence(text, 'en-US')).toBe(expected);
});

test('a malformed locale tag falls back rather than throwing', () => {
    expect(firstSentence('One. Two.', 'es_en')).toBe('One.');
});
