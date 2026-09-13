import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { EmailNotificationDefaults } from './EmailNotificationsSetting';

/**
 * The client offers three email groups and the server decides by them, so the
 * two have to name the same three and default them the same way.
 *
 * They cannot share a constant: `shared-types` is consumed type-only by the app
 * — its `package.json` points `main` at an `index.js` that does not exist — so
 * it can carry the *shape* of a preference but not its values. This does what
 * the repo's other sync tests do: read both and compare.
 */

const server = readFileSync(
    resolve(__dirname, '../../../functions/src/shared/index.ts'),
    'utf-8',
);

/** The groups the server's `NoticeEmailGroups` sorts notices into. */
function serverGroups(): Set<string> {
    const table = server.match(
        /export const NoticeEmailGroups[\s\S]*?= \{([\s\S]*?)\n\};/,
    );
    expect(table, 'no NoticeEmailGroups in shared/index.ts').not.toBeNull();
    return new Set(
        [...(table?.[1] ?? '').matchAll(/:\s*'(\w+)'/g)].map(
            (match) => match[1] ?? '',
        ),
    );
}

/** The server's own defaults, which apply to a creator who never chose. */
function serverDefaults(): Record<string, boolean> {
    const block = server.match(
        /export const EmailNotificationDefaults[\s\S]*?= \{([\s\S]*?)\n\};/,
    );
    expect(
        block,
        'no EmailNotificationDefaults in shared/index.ts',
    ).not.toBeNull();
    const defaults: Record<string, boolean> = {};
    for (const match of (block?.[1] ?? '').matchAll(/(\w+):\s*(true|false)/g)) {
        const [, group, value] = match;
        if (group !== undefined) defaults[group] = value === 'true';
    }
    return defaults;
}

describe('email notification groups', () => {
    test('the client offers exactly the groups the server sorts into', () => {
        expect([...serverGroups()].sort()).toEqual(
            Object.keys(EmailNotificationDefaults).sort(),
        );
    });

    test('and both sides default them the same way', () => {
        // A drift here is invisible until someone is written to who never
        // asked to be, or is not written to when they expected it.
        expect(serverDefaults()).toEqual(EmailNotificationDefaults);
    });

    test('social mail is off unless asked for', () => {
        // The one default worth pinning by name rather than by comparison: a
        // mail for every chat message is how a notification feature earns its
        // reputation.
        expect(EmailNotificationDefaults.activity).toBe(false);
    });
});
