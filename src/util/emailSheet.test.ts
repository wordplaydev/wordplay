import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import { buildSheets } from '../../scripts/emails/contactSheet';

/**
 * The committed contact sheet is generated, so it goes stale the moment someone
 * adds an email and forgets to run `npm run emails`. This is the same
 * generated-artifact drift check `contributorsFormat.test.ts` makes.
 *
 * Only the Markdown half is committed. The HTML preview regenerates on every
 * copy edit and is a 90KB blob, so it lives in gitignored `build/`.
 */
test('EMAILS.md matches the registry', async () => {
    const { markdown } = await buildSheets();
    const committed = readFileSync(
        resolve(__dirname, '../../EMAILS.md'),
        'utf-8',
    );
    expect(committed, 'EMAILS.md is out of date — run `npm run emails`').toBe(
        markdown,
    );
});
