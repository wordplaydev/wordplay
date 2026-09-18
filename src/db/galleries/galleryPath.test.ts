import { expect, test } from 'vitest';
import {
    foldGalleryPath,
    GalleryPathMaxLength,
    isValidGalleryPath,
    repairGalleryPath,
} from './galleryPath';

test.each([
    ['kim-p4', true, 'the ordinary case: a phrase shortened'],
    ['abc', true, 'the shortest allowed'],
    ['a'.repeat(GalleryPathMaxLength), true, 'the longest allowed'],
    ['ms-kims-4th-period', true, 'separators between every word'],
    ['4th-period', true, 'leading digits, as usernames also allow'],
    ['ab', false, 'shorter than the minimum'],
    ['a'.repeat(GalleryPathMaxLength + 1), false, 'longer than the maximum'],
    ['', false, 'empty'],
    ['-kim', false, 'a leading separator'],
    ['kim-', false, 'a trailing separator'],
    ['kim--p4', false, 'a doubled separator'],
    ['ms kim', false, 'a space'],
    ["kim's", false, 'an apostrophe'],
    ['kim_p4', false, 'an underscore, which reads as padding'],
    ['kim.p4', false, 'a dot, which is path syntax'],
    ['kim/p4', false, 'a slash, which is path syntax'],
    ['kim~p4', false, 'a tilde, which reads as padding'],
])('%s is %s — %s', (text, valid) => {
    expect(isValidGalleryPath(text)).toBe(valid);
});

test('a reserved name cannot be claimed', () => {
    // Resolution tries the id first, so `Games` would resolve to the built-in
    // example gallery and a cloud gallery holding it would be unreachable.
    for (const name of ['games', 'Games', 'GAMES', 'howto', 'wordplay'])
        expect(isValidGalleryPath(name), name).toBe(false);
});

test('a path shaped like a Firestore id cannot be claimed', () => {
    // Same reason: resolution tries the id first, so this could never resolve
    // to the gallery that holds it.
    expect(isValidGalleryPath('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(
        false,
    );
    // But a hyphenated name that merely contains hex is fine.
    expect(isValidGalleryPath('deadbeef-cafe')).toBe(true);
});

test('a compatibility spoof of a reserved name cannot be claimed', () => {
    // Both of these fold onto `games`. Refused by NFKC-stability rather than by
    // the blocklist, which is what makes the rule general: a URL is exactly
    // where a name that displays as one thing and reserves another is worth
    // something to someone.
    for (const spoof of ['Ｇａｍｅｓ', '𝐠𝐚𝐦𝐞𝐬']) {
        expect(isValidGalleryPath(spoof), spoof).toBe(false);
        expect(foldGalleryPath(spoof)).toBe('games');
    }
});

test('a path outside Latin can be claimed', () => {
    // This assertion exists to fail if someone ports isValidUsername's script
    // rules across. They are there so a username lexes as a Wordplay name; a
    // path is never lexed, and keeping them would make Wordplay's 26 locales
    // second-class in their own URLs.
    for (const name of ['日本語-ゲーム', 'مرحبا-2', 'мария-3', 'மனிதன்'])
        expect(isValidGalleryPath(name), name).toBe(true);
});

test('a path mixing scripts can be claimed', () => {
    // The other half of the rule above. `LatinRun || !AnyLatin` would refuse
    // every one of these, because a mixed name truncates a @username/Character
    // reference — which nothing does to a path.
    for (const name of ['nihongo-日本語', 'español-日本', 'abc-мария'])
        expect(isValidGalleryPath(name), name).toBe(true);
});

test('the two characters a username may not hold are fine in a path', () => {
    // `ƒ` opens a function and `ø` is none, so neither may appear in a name a
    // creator could type. A path is not a token.
    for (const name of ['ƒunction', 'øbject'])
        expect(isValidGalleryPath(name), name).toBe(true);
});

test('case folds together, but marks do not', () => {
    expect(foldGalleryPath('Games')).toBe(foldGalleryPath('games'));
    // José and Jose are two different names, and a mark-stripping fold would
    // make them one — along with every Devanagari pair whose matras are the
    // whole difference between them.
    expect(foldGalleryPath('José')).not.toBe(foldGalleryPath('Jose'));
});

test.each([
    ["Ms Kim's 4th Period", 'ms-kim-s-4th-period'],
    ['  leading and trailing  ', 'leading-and-trailing'],
    ['already-fine', 'already-fine'],
    ['UPPER CASE', 'upper-case'],
    ['日本語 ゲーム', '日本語-ゲーム'],
    ['!!!', ''],
])('repairs %s to %s', (input, expected) => {
    expect(repairGalleryPath(input)).toBe(expected);
});

test('a repair is offered only when it would be accepted', () => {
    // repairGalleryPath can still return something unclaimable — too short, or
    // reserved — so every caller checks the result rather than trusting it.
    expect(repairGalleryPath('!!!')).toBe('');
    expect(isValidGalleryPath(repairGalleryPath('!!!'))).toBe(false);
    expect(isValidGalleryPath(repairGalleryPath('Games'))).toBe(false);
    expect(isValidGalleryPath(repairGalleryPath("Ms Kim's 4th Period"))).toBe(
        true,
    );
});

test('a repair never exceeds the maximum length', () => {
    const repaired = repairGalleryPath('word '.repeat(40));
    expect([...repaired].length).toBeLessThanOrEqual(GalleryPathMaxLength);
    // And never ends on a separator, which truncation could otherwise leave.
    expect(repaired).not.toMatch(/-$/);
    expect(isValidGalleryPath(repaired)).toBe(true);
});
