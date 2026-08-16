import { conflictsIn } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';

/**
 * A match decides by equality against each case's key, so inside a case body the subject
 * can only be what that key is, and in the fallback it can only be what no key was —
 * exactly what a conditional's two branches get from `=`. It used to narrow nothing.
 */
const setup = `a•'x'|'y'|'z': 'x'
ƒ gx(t•'x') t
ƒ gy(t•'y') t
ƒ gz(t•'z') t
`;

test.each([
    ['a case body is its key', `a ??? 'x': gx(a)\n'q'`],
    ['a later case body is its own key', `a ??? 'x': 'q'\n'y': gy(a)\n'q'`],
    ['the fallback is what no case matched', `a ??? 'x': 'q'\n'y': 'q'\ngz(a)`],
])('%s', (_name, program) => {
    expect(conflictsIn(setup + program)).toEqual([]);
});

test.each([
    ['a case body is not a different key', `a ??? 'x': gy(a)\n'q'`],
    ['the fallback is not one of the keys', `a ??? 'x': 'q'\n'y': 'q'\ngy(a)`],
])('%s', (_name, program) => {
    expect(conflictsIn(setup + program)).not.toEqual([]);
});

/** A case runs only when every earlier one failed, so it sees their complement too. */
test('a later case sees what earlier cases ruled out', () => {
    expect(
        conflictsIn(`a•'x'|'y': 'x'
ƒ gy(t•'y') t
c: ⊤
a ??? 'x': 'q'
(c ? 'y' 'x'): gy(a)
'r'`),
    ).toEqual([]);
});

/**
 * These are the two ways narrowing could claim more than it knows, which would report
 * errors on correct programs — the failure worth guarding hardest against.
 */
test('a key whose value we cannot name rules nothing out', () => {
    // The only case key is computed, so the fallback must keep every type.
    expect(
        conflictsIn(`a•'x'|'y': 'x'
ƒ g(t•'x'|'y') t
c: ⊤
a ??? (c ? 'y' 'x'): 'q'
g(a)`),
    ).toEqual([]);
});

test('cases covering everything leave the fallback alone', () => {
    // The fallback is unreachable, which is true but useless to record: with no
    // unreachable-case conflict to report, an empty set only makes working code look
    // broken.
    expect(
        conflictsIn(`a•'x'|'y': 'x'
ƒ g(t•'x'|'y') t
a ??? 'x': 'q'
'y': 'r'
g(a)`),
    ).toEqual([]);
});

/** Same rule as `=`: which translation the reader sees isn't knowable while checking. */
test('a multi-translation case key rules nothing out', () => {
    expect(
        conflictsIn(`a•'x'|'equis'|'z': 'x'
ƒ g(t•'x'|'equis'|'z') t
a ??? 'x'/en,'equis'/es: 'q'
g(a)`),
    ).toEqual([]);
});

test('a match whose subject names itself terminates', { timeout: 5000 }, () => {
    // Binds that name each other are a conflict, not a parse error, so this
    // analysis still runs on them and still has to stop.
    expect(
        conflictsIn(`c•#|"": 1
d: (c•#) & e
e: d
d ? (c ??? 1: c + 1
0) 0`),
    ).toBeInstanceOf(Array);
});
