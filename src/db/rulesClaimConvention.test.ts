import { first } from '@util/nullable';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * Every privilege test in `firestore.rules` goes through one of five functions.
 *
 * `mod` used to be written out inline at thirteen sites with no shared helper,
 * which is exactly the shape that makes a superuser claim rot: the fourteenth
 * site is added by someone who has never heard of `admin`, it reads the token
 * directly, and an administrator is silently excluded from one collection with
 * no test anywhere failing. Enumerating the sites would not catch that — only
 * refusing the shape does.
 *
 * So: no rule may read `request.auth.token` except the five functions that
 * define what a privilege means. If you need a new claim, give it a function.
 */
const Rules = readFileSync('firestore.rules', 'utf8');

/** The five, in the order they're declared at the top of `documents`.
 *  `notProxying` is the odd one: it is about the *session*, not the account —
 *  a claim minted onto one token by `startProxy` and never written to anybody
 *  (#1313). It lives here because it is still a thing rules learn from the
 *  token, and the whole point of this test is that nothing else reads one. */
const ClaimFunctions = [
    'isAdmin',
    'isMod',
    'isTeacher',
    'isBanned',
    'notProxying',
];

/** A line with its comments and string contents removed, so that a sentence
 *  *about* the token doesn't read as a rule testing it. */
function code(line: string): string {
    return line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '""');
}

test('every claim test goes through one of the five claim functions', () => {
    const lines = Rules.split('\n');
    // The span each function occupies, so a token read inside one is expected.
    const inside = new Set<number>();
    for (const [index, line] of lines.entries()) {
        if (!ClaimFunctions.some((fn) => line.includes(`function ${fn}(`)))
            continue;
        // Every one is a short function; walk to its closing brace.
        let depth = 0;
        for (const [offset, current] of lines.slice(index).entries()) {
            const at = index + offset;
            inside.add(at);
            depth += (current.match(/\{/g) ?? []).length;
            depth -= (current.match(/\}/g) ?? []).length;
            if (depth === 0 && at > index) break;
        }
    }

    const offenders = lines
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(
            ({ line, number }) =>
                !inside.has(number - 1) &&
                code(line).includes('request.auth.token'),
        )
        .map(({ line, number }) => `firestore.rules:${number}: ${line.trim()}`);

    expect(
        offenders,
        'read the claim through isAdmin/isMod/isTeacher/isBanned/notProxying instead, so `admin` keeps implying the others and a proxy keeps writing nothing',
    ).toEqual([]);
});

test('the five claim functions are declared once, at the top level', () => {
    for (const fn of ClaimFunctions) {
        const declarations = Rules.split('\n').filter((line) =>
            line.includes(`function ${fn}(`),
        );
        // More than one means a nested copy shadowing the top-level one, which
        // is how `admin ⇒ teacher` would die for a single collection while
        // every other collection kept working. `isTeacher` was declared inside
        // `match /classes` before the superuser claim, and deleting that copy
        // is what made the implication reach the one place `teacher` is used.
        expect(
            declarations,
            `${fn} is declared ${declarations.length} times`,
        ).toHaveLength(1);
        // Four spaces of indent is the `documents` block; more is a collection.
        expect(
            first(declarations)?.match(/^ */)?.[0]?.length,
            `${fn} must be declared at the top of match /databases/{database}/documents`,
        ).toBe(4);
    }
});

test('admin implies mod and teacher, and never implies banned', () => {
    // The rules half of claimsSync.test.ts's table. A regex rather than an
    // evaluation because the emulator isn't running in this project; the rules
    // suite proves the behavior, this proves the intent stays legible.
    const body = (fn: string) =>
        Rules.slice(Rules.indexOf(`function ${fn}(`)).split('}')[0];

    expect(body('isMod')).toContain('isAdmin()');
    expect(body('isTeacher')).toContain('isAdmin()');
    // The asymmetry that is the whole design: a superuser is not exempt from a
    // decision about their own content.
    expect(body('isBanned')).not.toContain('isAdmin()');
});
