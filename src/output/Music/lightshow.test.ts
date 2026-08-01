import { expect, test } from 'vitest';
import type { InstrumentActivity } from '@output/Music/activity';
import {
    easeTint,
    MaxStrength,
    SmoothingSeconds,
    targetTint,
    tintToCSS,
} from '@output/Music/lightshow';
import { MinFlashHz } from '@output/PhotosensitivityAnalysis';

function sounding(
    instrument: string,
    level: number,
): InstrumentActivity {
    return { instrument, level, degree: 1, pan: 0, track: 0, strike: 1 };
}

test('silence has no tint', () => {
    expect(targetTint([])).toEqual({ hue: 0, strength: 0 });
});

test('the tint takes the hue of what is playing', () => {
    // Piano's hue is 260.
    expect(targetTint([sounding('piano', 1)]).hue).toBeCloseTo(260, 5);
});

test('an ensemble reads as one colour, not a jump between members', () => {
    // Two instruments at equal level land between their hues rather than on
    // either one.
    const both = targetTint([sounding('piano', 1), sounding('flute', 1)]);
    // piano 260, flute 180 → the short way around is 220.
    expect(both.hue).toBeCloseTo(220, 0);
});

test('the tint never gets stronger than the cap, however loud the music', () => {
    const loud = targetTint(
        Array.from({ length: 20 }, () => sounding('drums', 1)),
    );
    expect(loud.strength).toBeLessThanOrEqual(MaxStrength);
});

test('brightness cannot change fast enough to flash', () => {
    // The rate cap is the whole point: a full-screen colour pulsing at tempo
    // is exactly the flashing PhotosensitivityAnalysis polices, and 120bpm in
    // sixteenths is 8Hz. Traversing the full range must take at least as long
    // as one cycle at the flash threshold.
    let tint = { hue: 0, strength: 0 };
    const target = { hue: 0, strength: MaxStrength };
    // One frame at 60fps.
    const frame = 1 / 60;
    let elapsed = 0;
    while (tint.strength < MaxStrength * 0.9 && elapsed < 10) {
        tint = easeTint(tint, target, frame);
        elapsed += frame;
    }
    expect(elapsed).toBeGreaterThanOrEqual(1 / MinFlashHz / 2);
    expect(SmoothingSeconds).toBeCloseTo(1 / MinFlashHz, 10);
});

test('a single huge step still cannot overshoot the target', () => {
    const tint = easeTint(
        { hue: 0, strength: 0 },
        { hue: 100, strength: MaxStrength },
        1000,
    );
    expect(tint.strength).toBeCloseTo(MaxStrength, 10);
    expect(tint.hue).toBeCloseTo(100, 10);
});

test('hue eases the short way around the wheel', () => {
    // 350 → 10 should cross 0, not travel backwards through 180.
    const tint = easeTint(
        { hue: 350, strength: 0.2 },
        { hue: 10, strength: 0.2 },
        SmoothingSeconds / 2,
    );
    expect(tint.hue).toBeCloseTo(0, 5);
});

test('the CSS is a translucent overlay, so a creator background stays the base', () => {
    const css = tintToCSS({ hue: 200, strength: 0 });
    expect(css).toContain('/ 0%');
    expect(tintToCSS({ hue: 200, strength: MaxStrength })).toContain('/ 35%');
});
