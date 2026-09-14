import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
// The callable's own decision logic. Imported from claimChanges rather than
// setClaims because the root tsconfig installs no functions/node_modules, so
// reaching a module that imports firebase-functions fails CI while passing here.
import {
    WritableClaims,
    nextClaims,
} from '../../../functions/src/claimChanges';

const Admin = 'admin-uid';
const Other = 'other-uid';

function change(
    current: Record<string, unknown> | undefined,
    changes: Parameters<typeof nextClaims>[1],
    subject = Other,
) {
    return nextClaims(current, changes, { caller: Admin, subject });
}

test('granting spreads what is already there', () => {
    // setCustomUserClaims replaces the whole object, so anything this drops is
    // silently taken away — the trap ban() in moderate.ts documents.
    const { claims } = change({ teacher: true }, { mod: true });
    expect(claims).toEqual({ teacher: true, mod: true });
});

test('revoking deletes the key rather than writing false', () => {
    // Every rule tests `"x" in token && token.x`, so both work — but a token
    // carrying three falses on every request is waste.
    const { claims } = change({ mod: true, teacher: true }, { mod: false });
    expect(claims).toEqual({ teacher: true });
    expect('mod' in claims).toBe(false);
});

test('a claim nobody holds can be revoked without inventing it', () => {
    const { claims } = change({}, { mod: false });
    expect(claims).toEqual({});
});

test('an administrator may not take away their own privileges', () => {
    // Recoverable only with a service key, so it is refused rather than
    // confirmed.
    const { refusal } = change({ admin: true }, { admin: false }, Admin);
    expect(refusal).toBe('self-demotion');
});

test('an administrator may take away someone else’s', () => {
    const { claims, refusal } = change({ admin: true }, { admin: false });
    expect(refusal).toBeUndefined();
    expect(claims).toEqual({});
});

test('an administrator may still give themselves other privileges', () => {
    // Only the superuser claim is protected — granting yourself `teacher` to
    // try something out is an ordinary thing to want.
    const { claims, refusal } = change(
        { admin: true },
        { teacher: true },
        Admin,
    );
    expect(refusal).toBeUndefined();
    expect(claims).toEqual({ admin: true, teacher: true });
});

test('a ban cannot be issued here', () => {
    // A ban also un-publishes everything public and warns the creator, and
    // neither happens here. One path to a ban, and it is /moderate.
    expect(change({}, { banned: true }).refusal).toBe('ban');
});

test('a ban can be lifted here', () => {
    const { claims, refusal } = change(
        { banned: true, mod: true },
        { banned: false },
    );
    expect(refusal).toBeUndefined();
    expect(claims).toEqual({ mod: true });
});

test('an unknown claim is refused', () => {
    // The whitelist is what keeps this from writing arbitrary keys into
    // somebody's token.
    expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        change({}, { superuser: true } as never).refusal,
    ).toBe('unknown-claim');
});

test('the writable claims are exactly what scripts/claims.js knows', () => {
    // The script stays the recovery path for when nobody holds `admin` yet, so
    // the two lists have to name the same privileges or one of them can set
    // something the other cannot take back.
    const script = readFileSync('scripts/claims.js', 'utf8');
    const flags = script.match(/const flags = \[([^\]]*)\]/)?.[1];
    expect(flags, 'no flags array in scripts/claims.js').toBeDefined();
    const names = [...(flags ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect([...names].sort()).toEqual([...WritableClaims].sort());
});
