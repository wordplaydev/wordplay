import { matchGroups, must } from '@util/nullable';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * Every callable that does anything is refused to a proxy session (#1313).
 *
 * `firestore.rules` cannot enforce this: a proxy holds a real ID token for the
 * creator it is looking at, and callables run through the Admin SDK, which
 * rules do not govern. So a "read-only" session that could call
 * `switchToPassword` could set a password on that person's account — the exact
 * opposite of what the feature is for.
 *
 * Enumerating the guarded ones would rot the moment somebody adds the
 * nineteenth callable. So this asserts the shape instead: every `onCall` either
 * wraps its handler in `noProxy`, or is named here as read-only with a reason.
 */

/** Callables a proxy session may reach, and why each is safe.
 *
 *  Safe means: it writes nothing, spends nothing, and tells a proxy nothing the
 *  creator it is proxying could not already see. */
const ReadOnlyCallables: Record<string, string> = {
    getCreators:
        'Resolves uids to public names. Unauthenticated by design; a proxy learns nothing extra.',
    usernameAvailable:
        'Answers whether a name is free. Unauthenticated by design, App Check enforced.',
    findCreator:
        'Resolves a name or address to a uid and nothing else. The page the proxy came from already did this.',
};

const Index = readFileSync('functions/src/index.ts', 'utf8');

test('every callable is refused to a proxy session, or named read-only', () => {
    // `export const <name> = onCall<…>(<options>, <handler>);` — the options
    // and generics can span lines, so match to the closing paren of the call.
    const registrations = [
        ...Index.matchAll(
            /export const (\w+) = onCall(?:<[\s\S]*?>)?\(([\s\S]*?)\n\);/g,
        ),
    ].map((match) => {
        // Both groups are mandatory in the pattern, so a match carries them.
        const [, name, body] = matchGroups(match);
        return {
            name: must(name, 'an onCall export name'),
            body: must(body, 'an onCall body'),
        };
    });
    expect(
        registrations.length,
        'no onCall registrations found — did index.ts change shape?',
    ).toBeGreaterThan(10);

    const unguarded = registrations
        .filter(
            ({ name, body }) =>
                !body.includes('noProxy(') && !(name in ReadOnlyCallables),
        )
        .map(({ name }) => name);

    expect(
        unguarded,
        'wrap the handler in noProxy(), or add it to ReadOnlyCallables with a reason',
    ).toEqual([]);
});

test('the read-only exemptions still exist', () => {
    // An exemption for a callable that has been renamed or deleted is a comment
    // pretending to be a check.
    for (const name of Object.keys(ReadOnlyCallables))
        expect(Index, `${name} is exempted but no longer registered`).toContain(
            `export const ${name} = onCall`,
        );
});

test('the callables registered elsewhere are guarded too', () => {
    // Two are defined in their own modules and re-exported, so the regex above
    // never sees them.
    for (const file of [
        'functions/src/submitLocalization.ts',
        'functions/src/submitLocaleRequest.ts',
    ])
        expect(readFileSync(file, 'utf8'), `${file} is unguarded`).toContain(
            'noProxy(',
        );
});
