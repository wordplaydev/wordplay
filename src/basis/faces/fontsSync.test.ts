import { describe, expect, test } from 'vitest';
import {
    checkHashes,
    checkCssConsistency,
    checkMetrics,
    checkRegistryConsistency,
} from '../../../scripts/fonts/verify';
import { emojiRanges } from '../../../scripts/fonts/generate';
import { readLock } from '../../../scripts/fonts/lockfile';
import { Faces } from './faces.generated';
import { FaceMetrics } from './metrics.generated';
import { FallbackFaces } from './faces.fallback.generated';

/**
 * Uniform drift guard for the whole font system: if any font file changed, or
 * the generated registry / CSS was edited by hand, without running
 * `npm run fonts-fix`, these fast checks fail. (The deep "no range over-claims
 * its cmap" check runs in `npm run fonts -- --deep`; emoji ranges are guarded
 * by emojiRange.test.ts.)
 */

const lock = readLock();

// Every check here reads or measures each of the font files, so all of them are
// I/O-bound in a way the 5s default doesn't survive on a loaded machine: the
// metrics check reached 5.7s in CI and hashing every file blew it under a
// parallel local run, though both are well under a second idle.
describe(
    'font artifacts are in sync with the manifest + font files',
    { timeout: 30_000 },
    () => {
        test('every font file matches its lockfile hash', () => {
            expect(checkHashes(lock)).toEqual([]);
        });

        test('the committed CSS ranges match the lockfile', async () => {
            expect(await checkCssConsistency(lock)).toEqual([]);
        });

        test('faces.generated.ts matches the manifest + lockfile', async () => {
            const problems = await checkRegistryConsistency(
                lock,
                { Faces, FallbackFaces },
                await emojiRanges(),
            );
            expect(problems).toEqual([]);
        });

        test('metrics.generated.ts matches what the font files measure', async () => {
            expect(await checkMetrics(FaceMetrics)).toEqual([]);
        });
    },
);
