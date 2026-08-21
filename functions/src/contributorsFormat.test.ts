import { readFileSync } from 'fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import { serializeContributors, type ContributorsData } from './contributors';

/**
 * The refresh bot commits this file through the GitHub contents API, so nothing
 * formats it on the way in and the PR's `format:check` job is where a mismatch
 * surfaces — which is how every refresh PR started failing once the bot's
 * indentation and the repo's disagreed. Ask prettier itself rather than
 * restating its options, so a change to `.prettierrc` fails here instead.
 */
const FILE = 'src/routes/[[locale]]/thanks/contributors.json';

describe('contributors.json', () => {
    it('the bot writes it already prettier-formatted', async () => {
        const committed = readFileSync(FILE, 'utf8');
        const written = serializeContributors(
            JSON.parse(committed) as ContributorsData,
        );

        // What the bot would commit is byte-identical to what's in the repo...
        expect(written).toBe(committed);

        // ...and prettier agrees with both.
        const options = await resolveConfig(FILE);
        expect(await format(written, { ...options, filepath: FILE })).toBe(
            written,
        );
    });
});
