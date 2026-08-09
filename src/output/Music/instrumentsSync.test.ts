import { expect, test } from 'vitest';
import { Zones } from '@output/Music/samples.generated';
import {
    InstrumentKeys,
    Instruments,
    sung,
    type InstrumentKey,
} from '@output/Music/instruments';
import { Recipes, kitIndex } from '@output/Music/synthesis';
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
        expect(
            generated,
            `${id} missing from samples.generated.ts`,
        ).toBeDefined();
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

test('pitched zones are ordered by root, with one zone per root', () => {
    // Only pitched instruments: a kit's pieces deliberately share a root,
    // because they are never transposed — the degree picks which recording
    // plays, not how far to shift one.
    for (const [id, zones] of Object.entries(Zones)) {
        if (Instruments[id as InstrumentKey]?.pitched === false) continue;
        const roots = zones.map((zone) => zone.root);
        expect(
            [...roots].sort((a, b) => a - b),
            id,
        ).toEqual(roots);
        expect(new Set(roots).size, `${id} has duplicate roots`).toBe(
            roots.length,
        );
    }
});

test('kit zones keep the manifest order, which is the degree order', () => {
    // A kit's file order *is* its degree mapping, so it must not be sorted
    // by root the way pitched zones are — sorting would silently remap every
    // degree to a different sound.
    for (const id of InstrumentKeys) {
        const spec = Instruments[id];
        if (spec.pitched || spec.kit === undefined) continue;
        const zones = Zones[id];
        if (zones === undefined || zones.length < 2) continue;
        // Each piece's file is named after it, so the two lists must agree
        // position by position.
        const files = zones.map((zone) =>
            zone.file.split('/')[1].replace('.mp3', ''),
        );
        expect(files, `${id} zone order`).toEqual(
            spec.kit.map((piece) =>
                piece.toLowerCase().replace(/[^a-z0-9]+/g, ''),
            ),
        );
    }
});

test('tuning corrections are small, since the libraries are already at A440', () => {
    // A large correction would mean a zone isn't the note it claims to be —
    // the build refuses to ship one, and this keeps that guarantee visible.
    for (const [id, zones] of Object.entries(Zones))
        for (const zone of zones)
            expect(
                Math.abs(zone.detune),
                `${id}/${zone.file}`,
            ).toBeLessThanOrEqual(50);
});

test('percussion zones line up one-to-one with the kit they index', () => {
    // Degrees index the kit, so zone N must be kit piece N. When zones were
    // chosen by nearest root instead — the rule pitched instruments use —
    // degree 1 struck a cymbal and degrees 3 through 6 all struck the
    // cowbell, because the roots are arbitrary labels rather than a scale.
    for (const id of InstrumentKeys) {
        const spec = Instruments[id];
        if (spec.pitched || spec.kit === undefined) continue;
        const zones = Zones[id];
        if (zones === undefined) continue;
        expect(
            zones.length,
            `${id} has ${zones.length} zones for ${spec.kit.length} kit pieces`,
        ).toBe(spec.kit.length);
    }
});

test('kit indices wrap and never depend on the synth pitch offset', () => {
    // The synth shifts a noise burst per kit piece; that number must not be
    // what selects a recording.
    expect(kitIndex('drums', 1)).toBe(0);
    expect(kitIndex('drums', 6)).toBe(5);
    // Degrees past the kit wrap around to the start.
    expect(kitIndex('drums', 7)).toBe(0);
    expect(kitIndex('drums', 0)).toBe(5);
});

test('the palette and the recipes agree about who sings', () => {
    // Two truths about the same thing: `sings` is the palette fact the sheet
    // reads to decide whether to draw a lyric, and `source: 'voice'` is the
    // synthesis fact `MusicAudio` reads to decide which graph to build. They
    // answer different questions, so they both exist — and a lyric drawn under
    // a track that won't sound it, or sounded under one that shows nothing, is
    // what it looks like when they drift apart.
    for (const key of InstrumentKeys)
        expect(sung(key), key).toBe(Recipes[key].source === 'voice');
    // And exactly one instrument sings, so neither is vacuously true.
    expect(InstrumentKeys.filter((key) => sung(key))).toEqual(['voice']);
});

test('every instrument has its own hue, and its own emoji', () => {
    // Hues are stable per instrument across every project and drive the light
    // show, the mood cloud, and the orchestra view, so two instruments sharing
    // one are indistinguishable in all three. The emoji is the sheet's label
    // and the palette's picker, so a shared one is the same problem in text.
    const hues = InstrumentKeys.map((key) => Instruments[key].hue);
    expect(new Set(hues).size).toBe(hues.length);
    for (const hue of hues) {
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
    }
    const emoji = InstrumentKeys.map((key) => Instruments[key].emoji).filter(
        (value) => value !== undefined,
    );
    expect(new Set(emoji).size).toBe(emoji.length);
});
