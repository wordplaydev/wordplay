import { ReferenceNameRegExPattern } from '@parser/Tokenizer';
import ReservedSymbols from '@parser/ReservedSymbols';
import { describe, expect, test } from 'vitest';
import {
    foldUsername,
    isPlausibleUsername,
    isValidUsername,
    ReservedLetters,
    UsernameLength,
    UsernameMaxLength,
} from './username';

const Reference = new RegExp(`^${ReferenceNameRegExPattern}$`, 'u');

describe('folding', () => {
    test.each([
        ['Alice', 'alice'],
        ['ALICE', 'alice'],
        // Full-width and math-bold are compatibility spellings of the same
        // letters, so they must reserve the same name rather than a second one.
        ['Ａlice', 'alice'],
        ['𝐚𝐥𝐢𝐜𝐞', 'alice'],
    ])('%s folds onto %s', (input, folded) => {
        expect(foldUsername(input)).toBe(folded);
    });

    test('accents are a difference, not a spelling', () => {
        // foldTagName would strip these; a username fold must not, or `José`
        // and `Jose` become one name and Devanagari names whose matras are the
        // whole difference collide.
        expect(foldUsername('José')).not.toBe(foldUsername('Jose'));
        expect(foldUsername('मनीषा')).not.toBe(foldUsername('मनिषा'));
    });

    test('folding is idempotent', () => {
        for (const name of ['Alice', 'José', 'Ａlice', 'МАША'])
            expect(foldUsername(foldUsername(name))).toBe(foldUsername(name));
    });
});

describe('claiming', () => {
    test.each([
        'alice',
        'amyjko',
        'José4',
        'мария',
        'こんにちは',
        'مرحبابك',
        'மனிதன்',
        // A digit may lead. There was a rule against it, on the grounds that
        // such a name reads as a number — but the grammar accepts one, and
        // three real accounts had one, so the rule only broke working
        // references. See the round-trip test below, which is the real
        // constraint.
        '2alice',
        '103111',
        '76hjpace',
    ])('%s may be claimed', (name) => {
        expect(isValidUsername(name)).toBe(true);
    });

    test.each([
        ['abcd', 'too short'],
        ['a'.repeat(UsernameMaxLength + 1), 'too long'],
        ['ali ce', 'contains a space'],
        ['a_bcde', 'underscore is the placeholder symbol'],
        ['a-bcde', 'hyphen is an operator'],
        ['a.bcde', 'period is the property symbol'],
        ['alice@example.com', 'an email is not a username'],
        ['øalice', 'ø is none'],
        ['ƒunction', 'ƒ is function'],
        ['aliceπ', 'mixes Latin and Greek'],
        ['Ａlice', 'a compatibility spelling of alice'],
        ['𝐚𝐥𝐢𝐜𝐞', 'a compatibility spelling of alice'],
        ['ali‍ce', 'a zero-width joiner is invisible'],
    ])('%s may not be claimed: %s', (name) => {
        expect(isValidUsername(name)).toBe(false);
    });

    test('every claimable name lexes as half of a character reference', () => {
        // The property the whole rule exists for: a username that cannot be the
        // first half of `@username/Character` is one whose characters can never
        // be referenced, in anyone's project.
        const names = [
            'alice',
            'amyjko',
            'José4',
            'мария',
            'こんにちは',
            'مرحبابك',
            'மனிதன்',
            '2alice',
            '103111',
            '76hjpace',
            'a'.repeat(UsernameMaxLength),
        ];
        for (const name of names) {
            expect(isValidUsername(name), name).toBe(true);
            expect(Reference.test(name), name).toBe(true);
        }
    });
});

test('the reserved-letter list is still complete', () => {
    // Nearly every reserved symbol is punctuation, which the charset rule
    // already excludes — but `ƒ` and `ø` are letters, so a charset of
    // \p{L}\p{M}\p{N} would admit them and produce a username that cannot lex.
    // Sweeping rather than trusting the constant means that adding a reserved
    // symbol which happens to be a letter fails here, loudly, instead of
    // silently breaking one creator's character references.
    const reserved = new Set([...ReservedSymbols.join('')]);
    const found = [...reserved].filter((c) => /^[\p{L}\p{M}\p{N}]$/u.test(c));
    expect(found.toSorted()).toEqual([...ReservedLetters].toSorted());
});

test('no letter outside the reserved list is rejected by the tokenizer', () => {
    // The other direction of the same claim, swept across the BMP: if some
    // other letter were unlexable, the charset rule would admit a name that
    // fails at reference time.
    const unlexable: string[] = [];
    for (let cp = 0x20; cp <= 0xffff; cp++) {
        const c = String.fromCodePoint(cp);
        if (/^[\p{L}\p{N}]$/u.test(c) && !Reference.test(c)) unlexable.push(c);
    }
    expect(unlexable.toSorted()).toEqual([...ReservedLetters].toSorted());
});

describe('signing in', () => {
    test.each(['a_bcde', 'a-bcde', 'a.bcde', 'øalice'])(
        '%s stays usable, because an account may already have it',
        (name) => {
            // Tightening the claim rule must never lock an existing creator out
            // of their own account, so the sign-in and add-collaborator fields
            // keep accepting what the original rule allowed.
            expect(isValidUsername(name)).toBe(false);
            expect(isPlausibleUsername(name)).toBe(true);
        },
    );

    test.each(['abcd', 'ali ce', 'alice@example.com'])(
        '%s is rejected either way',
        (name) => {
            expect(isPlausibleUsername(name)).toBe(false);
        },
    );

    test('anything claimable is plausible', () => {
        for (const name of ['alice', 'мария', 'こんにちは'])
            expect(isPlausibleUsername(name)).toBe(true);
    });

    test('the minimum length is the one the join prompt quotes', () => {
        expect(UsernameLength).toBe(5);
    });
});
