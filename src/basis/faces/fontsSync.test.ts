import { describe, expect, test } from 'vitest';
import {
    checkHashes,
    checkCssConsistency,
    checkRegistryConsistency,
} from '../../../scripts/fonts/verify';
import { emojiRanges } from '../../../scripts/fonts/generate';
import { readLock } from '../../../scripts/fonts/lockfile';
import * as generated from './faces.generated';

/**
 * Uniform drift guard for the whole font system: if any font file changed, or
 * the generated registry / CSS was edited by hand, without running
 * `npm run fonts-fix`, these fast checks fail. (The deep "no range over-claims
 * its cmap" check runs in `npm run fonts -- --deep`; emoji ranges are guarded
 * by emojiRange.test.ts.)
 */

const lock = readLock();

describe('font artifacts are in sync with the manifest + font files', () => {
    test('every font file matches its lockfile hash', () => {
        expect(checkHashes(lock)).toEqual([]);
    });

    test('the committed CSS ranges match the lockfile', async () => {
        expect(await checkCssConsistency(lock)).toEqual([]);
    });

    test('faces.generated.ts matches the manifest + lockfile', async () => {
        const problems = await checkRegistryConsistency(
            lock,
            generated,
            await emojiRanges(),
        );
        expect(problems).toEqual([]);
    });
});
