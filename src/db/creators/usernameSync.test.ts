import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import * as server from '../../../functions/src/username';
import * as client from './username';
import { Creator } from './CreatorDatabase';

/**
 * `functions/` compiles with rootDir "src" and cannot import from src/, so the
 * username rules exist twice. The server copy is the authority — it is what
 * decides a claim — and the client copy is what the join form validates with as
 * you type.
 *
 * A drift between them is silent in the worst direction: the form would accept
 * a name the callable then refuses, so the creator is told their name is taken
 * when it is merely unspellable, or the form refuses a name that would have
 * been fine. Compare behavior rather than source text, so a rule reworded on
 * one side only still passes and a rule *changed* on one side only fails.
 */

const Corpus = [
    'alice',
    'amyjko',
    'José4',
    'мария',
    'こんにちは',
    'مرحبابك',
    'மனிதன்',
    'abcd',
    'a'.repeat(31),
    'ali ce',
    'a_bcde',
    'a-bcde',
    'a.bcde',
    'alice@example.com',
    '2alice',
    'øalice',
    'ƒunction',
    'aliceπ',
    'Ａlice',
    '𝐚𝐥𝐢𝐜𝐞',
    'Alice',
    'ALICE',
    'José',
    'Jose',
    '',
];

test('both copies accept and refuse exactly the same names', () => {
    for (const name of Corpus)
        expect(server.isValidUsername(name), name).toBe(
            client.isValidUsername(name),
        );
});

test('both copies repair a name the same way', () => {
    // The client suggests a repair as you type; the script applies one in bulk.
    // If they disagreed, the form would offer a name the repair would not
    // produce, or refuse one it would.
    for (const name of Corpus)
        expect(server.repairUsername(name), name).toBe(
            client.repairUsername(name),
        );
});

test('both copies fold to the same key', () => {
    // The fold decides uniqueness. If the two disagreed, a name could be
    // reserved under one key and looked up under another, and two accounts
    // would end up rendering the same username.
    for (const name of Corpus)
        expect(server.foldUsername(name), name).toBe(client.foldUsername(name));
});

test('the shared constants match', () => {
    expect(server.UsernameLength).toBe(client.UsernameLength);
    expect(server.UsernameMaxLength).toBe(client.UsernameMaxLength);
    expect(server.ReservedLetters).toBe(client.ReservedLetters);
});

test('the server copy imports nothing', () => {
    // It has to stay standalone: anything it imported from src/ would compile
    // here and fail to deploy, and the failure would appear as a broken
    // function rather than a broken build.
    const source = readFileSync(
        path.join(process.cwd(), 'functions/src/username.ts'),
        'utf-8',
    );
    expect(source).not.toMatch(/^\s*import\s/m);
});

test('both copies synthesize the same address for a username', () => {
    // Firebase Auth has no username primitive, so a username account signs in
    // with `<name>@u.wordplay.dev`. If the server appended a different domain,
    // joinAccount would create an account the login page could never find.
    for (const name of ['alice', 'amyjko', 'мария'])
        expect(server.usernameEmail(name)).toBe(Creator.usernameEmail(name));
    expect(server.UsernameEmailDomain).toBe(Creator.CreatorUsernameEmailDomain);
});

test('the server reads a username back out of a synthesized address', () => {
    expect(server.usernameFromEmail('alice@u.wordplay.dev')).toBe('alice');
    // A real address has no username in it — that distinction is what tells a
    // password account from an email account.
    expect(server.usernameFromEmail('alice@example.com')).toBeUndefined();
});

test('the audit script imports the rule rather than copying it', () => {
    // A third copy would drift, and a drifted audit does not break the app — it
    // mis-reports, either inventing a backlog of affected creators or hiding
    // one. So the script imports the server's compiled copy instead.
    const source = readFileSync(
        path.join(process.cwd(), 'scripts/audit-usernames.ts'),
        'utf-8',
    );
    expect(source).toMatch(
        /import \{[^}]*isValidUsername[^}]*\} from '\.\.\/functions\/src\/username'/s,
    );
    // And defines no rule of its own.
    expect(source).not.toMatch(/function isValidUsername/);
});
