import { describe, expect, test } from 'vitest';
import { readLock } from '../../../scripts/logo/lockfile';
import { checkInputs, checkOutputs } from '../../../scripts/logo/verify';

/**
 * The generated logo assets in static/icons are a pure function of the
 * geometry in logoMark.ts and the manifest in scripts/logo. If either
 * changed — or an asset was edited or deleted by hand — without running
 * `npm run logo-fix`, these hash checks fail. They share their checks with
 * the `npm run logo` CLI the way fontsSync.test.ts shares
 * scripts/fonts/verify.ts.
 */
describe('logo assets are in sync', () => {
    const lock = readLock();

    test('inputs match the lock', () => {
        expect(checkInputs(lock)).toEqual([]);
    });

    test('generated assets match the lock', () => {
        expect(checkOutputs(lock)).toEqual([]);
    });
});
