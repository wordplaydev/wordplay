import { expect, test } from 'vitest';
import fitZ, { NaturalSizeZ } from '@components/output/fit';
import {
    FOCAL_LENGTH,
    PX_PER_METER,
    rootScale,
} from '@output/Output/outputToCSS';

/** The scale the camera renders output at when focused at the given z. */
function scaleAt(z: number | undefined) {
    return rootScale(0, z ?? 0);
}

test('the focus is always in front of the output, even with nothing to frame', () => {
    // An empty phrase measures exactly 0x0. Fitting it used to solve to z = 0, which put
    // the camera in the output's own plane: `place.z > focus.z` is false at z = 0, so the
    // stage rendered completely blank.
    for (const [width, height] of [
        [0, 0],
        [0, 1],
        [1, 0],
    ])
        expect(fitZ(width, height, 360, 280)).toBeLessThan(0);
});

test('content with no extent is rendered at natural size, not magnified', () => {
    // The fit scale is available/content, so framing a small box magnifies more, not
    // less — whatever placeholder the view paints for an empty phrase would then fill
    // the stage. Nothing to frame means nothing to magnify.
    expect(fitZ(0, 0, 360, 280)).toBe(NaturalSizeZ);
    expect(scaleAt(fitZ(0, 0, 360, 280))).toBe(1);
    // And it doesn't depend on the viewport, since it isn't fitting to it.
    expect(fitZ(0, 0, 1600, 1000)).toBe(NaturalSizeZ);
});

test('one empty dimension still frames by the axis that has extent', () => {
    // A stack of empty phrases has height (its padding) but no width. The axis with
    // extent is the one to frame by; the zero one divides to Infinity and loses the
    // comparison, so it can't drag the fit to a degenerate z.
    const metre = PX_PER_METER * FOCAL_LENGTH;
    expect(fitZ(0, 1, 360, 280)).toBeCloseTo(-metre / 280, 10);
    expect(fitZ(1, 0, 360, 280)).toBeCloseTo(-metre / 360, 10);
});

test('content that is merely small still fills the view', () => {
    // A creator asking for tiny text still gets it framed; only a true zero opts out.
    const small = fitZ(0.5, 0.1, 360, 280);
    expect(small).toBeLessThan(0);
    expect(scaleAt(small)).toBeGreaterThan(scaleAt(fitZ(1, 1, 360, 280)));
});

test('the fit leaves content as large as it can be without clipping', () => {
    const scale = scaleAt(fitZ(4, 1, 360, 280));
    expect(4 * PX_PER_METER * scale).toBeLessThanOrEqual(360 + 0.001);
    expect(1 * PX_PER_METER * scale).toBeLessThanOrEqual(280 + 0.001);
    // The wide dimension is the binding one here, so it fills its axis exactly.
    expect(4 * PX_PER_METER * scale).toBeCloseTo(360, 6);
});

test('an unmeasured viewport has no fit rather than an infinite one', () => {
    // Dividing by a zero viewport produced z = -Infinity, scaling all output to nothing.
    expect(fitZ(1, 1, 0, 280)).toBeUndefined();
    expect(fitZ(1, 1, 360, 0)).toBeUndefined();
    expect(fitZ(1, 1, -10, 280)).toBeUndefined();
});

test('the solved z is the one the camera math actually needs', () => {
    // Guards the constraint solution against drift in FOCAL_LENGTH/PX_PER_METER.
    expect(fitZ(1, 1, 360, 280)).toBeCloseTo(
        -(1 * PX_PER_METER * FOCAL_LENGTH) / 280,
        10,
    );
});
