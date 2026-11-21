import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Every e2e spec must take its `test` from playwright/pageErrors.ts (directly
 * or through playwright/fixtures.ts), whose guard fails a test on an uncaught
 * page exception. A spec importing values straight from `@playwright/test`
 * would silently opt out of it. Type-only imports are harmless.
 */
test('every e2e spec takes its test from the page error guard', () => {
    const directory = resolve(__dirname, '../../tests/end2end');
    const offenders = readdirSync(directory)
        .filter((name) => name.endsWith('.spec.ts'))
        .filter((name) =>
            /^import\s+(?!type\b)[^;]*from\s+'@playwright\/test'/m.test(
                readFileSync(resolve(directory, name), 'utf-8'),
            ),
        );
    expect(
        offenders,
        `Import from '../../playwright/pageErrors' (or '../../playwright/fixtures' to sign in) instead of '@playwright/test'.`,
    ).toEqual([]);
});
