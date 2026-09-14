import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * No rule lets a proxy session write (#1313).
 *
 * A proxy holds a genuine ID token for the creator it is looking at, so every
 * rule that admits *them* admits it too — including the `isMod()` branches, if
 * the person being looked at is a moderator. The only thing separating looking
 * from acting is `notProxying()` on every write.
 *
 * Enumerating the rules would be worthless: the point is the thirty-second
 * write rule, added next year by somebody who has never heard of this feature,
 * which would silently admit a proxy with nothing failing anywhere. So this
 * asserts the shape of the whole file instead.
 */
const Rules = readFileSync('firestore.rules', 'utf8');

/** Verbs that let a client change something. */
const Writes = ['create', 'update', 'delete', 'write'];

/** Every `allow …:` statement, with its verbs and its whole body. */
function allows(): { verbs: string[]; body: string; line: number }[] {
    const lines = Rules.split('\n');
    const found: { verbs: string[]; body: string; line: number }[] = [];
    for (let at = 0; at < lines.length; at++) {
        // The `if` may sit on the next line — `allow update:` in `projects`
        // does, which is how the first draft of this test missed the single
        // most important write rule in the file while reporting success. Match
        // the verbs alone and let the statement run to its semicolon.
        const match = /^\s*allow ([a-z, ]+):(\s*if\s|\s*$)/.exec(lines[at]);
        if (match === null) continue;
        // A statement runs to its terminating semicolon, and plenty span lines.
        let end = at;
        while (end < lines.length && !lines[end].includes(';')) end++;
        found.push({
            verbs: match[1].split(',').map((verb) => verb.trim()),
            body: lines.slice(at, end + 1).join('\n'),
            line: at + 1,
        });
    }
    return found;
}

test('every rule that grants a write refuses a proxy session', () => {
    const offenders = allows()
        .filter(({ verbs }) => verbs.some((verb) => Writes.includes(verb)))
        // `if false` grants nothing to anybody, proxy included.
        .filter(({ body }) => !body.includes('if false'))
        .filter(({ body }) => !body.includes('notProxying()'))
        .map(({ line, verbs }) => `firestore.rules:${line}: allow ${verbs}`);

    expect(
        offenders,
        'add `&& notProxying()` so a read-only session cannot reach this',
    ).toEqual([]);
});

test('the guard binds above the branches, not inside one', () => {
    // A rule that admits an owner OR a moderator has to refuse a proxy either
    // way. `notProxying()` inside one arm of a disjunction would admit a proxy
    // of a moderator through the other — the same trap `howToMayBePublic()` is
    // placed above its branches to avoid.
    const inside = allows()
        .filter(({ body }) => body.includes('notProxying()'))
        .filter(({ body }) => {
            // Everything after the guard, on the same statement. If a bare `||`
            // follows it, the guard is one alternative rather than a condition
            // on all of them.
            const after = body.slice(body.indexOf('notProxying()'));
            return /\|\|/.test(after);
        })
        .map(({ line }) => `firestore.rules:${line}`);

    expect(
        inside,
        'notProxying() must be ANDed with the whole condition, not ORed into one branch',
    ).toEqual([]);
});

test('the audit trail is server-written and administrator-read', () => {
    // The record of who proxied as whom is the only thing that makes this
    // feature accountable, so no client may write it.
    const start = Rules.indexOf('match /proxies/{id}');
    expect(start, 'no rule block for the audit trail').toBeGreaterThan(-1);
    // To the start of the next sibling match, so a `}` inside the block (or the
    // block's own closing brace) doesn't cut it short.
    const rest = Rules.slice(start);
    const next = rest.slice(1).search(/\n {4}match \//);
    const block = next === -1 ? rest : rest.slice(0, next + 1);
    expect(block).toContain('allow read: if isAdmin();');
    expect(block).toContain('allow write: if false;');
});
