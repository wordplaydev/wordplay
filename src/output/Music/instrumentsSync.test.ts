import { expect, test } from 'vitest';
import { Zones } from '@output/Music/samples.generated';
import { InstrumentKeys } from '@output/Music/instruments';
import {
    checkHashes,
    checkProvenance,
    checkSettings,
    readLock,
} from '../../../scripts/instruments/verify';
import { unaccountedInstruments } from '../../../scripts/instruments/build';

/**
 * Drift detection for the shipped instrument recordings, sharing its checks
 * with the `npm run instruments` CLI the way `fontsSync.test.ts` shares
 * `scripts/fonts/verify.ts`. The cheap checks run on every test run so a
 * hand-edited mp3 or a stale zone map can't reach a deploy.
 */

const lock = readLock();

test('the lockfile exists', () => {
    expect(lock, 'run `npm run instruments-build`').toBeDefined();
});

test('every shipped zone is byte-identical to what was built', () => {
    expect(checkHashes(lock!)).toEqual([]);
});

test('the zones were built with the settings the manifest declares', () => {
    expect(checkSettings(lock!)).toEqual([]);
});

test('every zone records its provenance and is CC0', () => {
    // We ship derivatives — trimmed, normalized, re-encoded — so anything
    // with an attribution chain or a share-alike clause would attach its
    // terms to the palette.
    expect(checkProvenance(lock!)).toEqual([]);
});

test('the generated zone map agrees with the lockfile', () => {
    for (const [id, zones] of Object.entries(lock!.instruments)) {
        const generated = Zones[id];
        expect(generated, `${id} missing from samples.generated.ts`).toBeDefined();
        expect(generated.map((zone) => zone.file)).toEqual(
            zones.map((zone) => zone.file),
        );
        expect(generated.map((zone) => zone.root)).toEqual(
            zones.map((zone) => zone.root),
        );
    }
});

test('every palette instrument is either sampled or deliberately synthesized', () => {
    // A palette entry with neither recordings nor a place on the
    // synthesis-only list is a gap someone forgot, not a gap someone chose.
    expect(unaccountedInstruments([...InstrumentKeys])).toEqual([]);
});

test('zones are ordered by root and cover a usable range', () => {
    for (const [id, zones] of Object.entries(Zones)) {
        const roots = zones.map((zone) => zone.root);
        expect([...roots].sort((a, b) => a - b), id).toEqual(roots);
        expect(new Set(roots).size, `${id} has duplicate roots`).toBe(
            roots.length,
        );
    }
});

test('tuning corrections are small, since the libraries are already at A440', () => {
    // A large correction would mean a zone isn't the note it claims to be —
    // the build refuses to ship one, and this keeps that guarantee visible.
    for (const [id, zones] of Object.entries(Zones))
        for (const zone of zones)
            expect(Math.abs(zone.detune), `${id}/${zone.file}`).toBeLessThanOrEqual(50);
});
