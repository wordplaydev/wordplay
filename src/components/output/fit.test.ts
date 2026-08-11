import { expect, test } from 'vitest';
import fitZ, {
    MaxPullback,
    NaturalSizeZ,
    NearestZ,
    ReferenceHeight,
    ReferenceWidth,
    composeZ,
    growEnvelope,
    responsiveZ,
    type Box,
} from '@components/output/fit';
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

function box(left: number, right: number, bottom: number, top: number): Box {
    return { left, right, top, bottom };
}

/** The bounds a Follow Me-shaped project reports for a pointer at (x, y): a 2m phrase at the
 *  pointer, unioned with the origin, since Stage.getLayout seeds its bounds there. */
function followBounds(x: number, y: number): Box {
    return box(
        Math.min(0, x),
        Math.max(0, x + 2),
        Math.min(0, y),
        Math.max(0, y + 2),
    );
}

test('the frame expands immediately so content never clips', () => {
    const grown = growEnvelope(box(-1, 1, -1, 1), box(-5, 2, -1, 3));
    expect(grown).toEqual(box(-5, 2, -1, 3));
});

test('the frame covers everything it has seen', () => {
    let envelope = growEnvelope(undefined, box(-1, 1, -1, 1));
    envelope = growEnvelope(envelope, box(-4, 0, 0, 2));
    envelope = growEnvelope(envelope, box(0, 6, -3, 0));
    expect(envelope).toEqual(box(-4, 6, -3, 2));
});

test('the frame never tightens back in', () => {
    // A frame that shrinks again after a quiet moment reads as a malfunction, so content
    // getting smaller leaves the framing alone however long it stays small.
    let envelope = growEnvelope(undefined, box(-10, 10, -10, 10));
    for (let i = 0; i < 500; i++)
        envelope = growEnvelope(envelope, box(-1, 1, -1, 1));
    expect(envelope).toEqual(box(-10, 10, -10, 10));
});

test('a roaming pointer settles to a still frame instead of chasing it', () => {
    // The Follow Me regression. Fitting instantaneous bounds rescaled every frame, so the
    // eyes never appeared to move; the frame must stop changing once the pointer has
    // covered its range.
    let envelope: Box | undefined = undefined;
    const zs: (number | undefined)[] = [];
    const laps = 3;
    const steps = 40;

    for (let i = 0; i < laps * steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        envelope = growEnvelope(
            envelope,
            followBounds(Math.cos(angle) * 4, Math.sin(angle) * 4),
        );
        zs.push(
            fitZ(
                envelope.right - envelope.left,
                envelope.top - envelope.bottom,
                360,
                280,
            ),
        );
    }

    // By the final lap the frame covers everywhere the pointer goes, so the fit is constant.
    const lastLap = zs.slice(-steps);
    expect(new Set(lastLap).size).toBe(1);
    expect(lastLap[0]).toBeDefined();
    // And it did have to move at some point to get there — otherwise this proves nothing.
    expect(new Set(zs).size).toBeGreaterThan(1);
});

test('the audience zoom composes onto the base rather than replacing it', () => {
    // The Heart Attack regression: a zoom used to replace the whole camera, freezing the
    // program's motion. With an offset, a moving base still moves.
    const dz = -4;
    expect(composeZ(-1, dz)).not.toBe(composeZ(-1.5, dz));
    expect(composeZ(-1.5, dz) - composeZ(-1, dz)).toBeCloseTo(-0.5, 10);
});

test('the audience cannot push the camera into the output plane', () => {
    expect(composeZ(-12, 100)).toBe(NearestZ);
    expect(composeZ(-12, 0)).toBe(-12);
});

test('a program closer than the near bound keeps its own camera', () => {
    // Heart Attack plays at -1m, nearer than NearestZ. The bound constrains the audience,
    // not the program, so the authored camera survives untouched.
    expect(composeZ(-0.25, 0)).toBe(-0.25);
    expect(composeZ(-0.25, 100)).toBe(-0.25);
});

test('zooming out is never capped', () => {
    // Pinch used to clamp at -40 while wheel and buttons were unbounded, so touch hit a
    // wall that a scroll wheel never did.
    expect(composeZ(-12, -100)).toBe(-112);
    expect(composeZ(-12, -1_000_000)).toBe(-1_000_012);
    // Monotonic all the way out, well past the old wall.
    let previous = composeZ(-12, 0);
    for (let dz = -10; dz >= -500; dz -= 10) {
        const next = composeZ(-12, dz);
        expect(next).toBeLessThan(previous);
        previous = next;
    }
});

test('a nonsense zoom is ignored rather than obeyed', () => {
    // Falling back to the near bound would turn an infinite zoom-out into maximum zoom-in;
    // keeping the base is the sane recovery.
    expect(composeZ(-12, Number.NaN)).toBe(-12);
    expect(composeZ(-12, -Infinity)).toBe(-12);
});

test('a viewport at or above the reference renders the camera as authored', () => {
    expect(responsiveZ(-12, ReferenceWidth, ReferenceHeight)).toBe(-12);
    expect(responsiveZ(-12, 1600, 1000)).toBe(-12);
    // Desktop-class stages measured in calibration must all be untouched.
    expect(responsiveZ(-12, 1280, 703)).toBe(-12);
    expect(responsiveZ(-12, 1024, 606)).toBe(-12);
});

test('a narrow viewport pulls the camera back, never closer', () => {
    const authored = -1;
    const pulled = responsiveZ(authored, 390, 750);
    // Further back means a more negative z, so more of the world is visible.
    expect(pulled).toBeLessThan(authored);
    // A phone's shortfall sits under the cap, so it pulls back proportionally — and that
    // still clears the 1.63x this layout measured as needing.
    expect(ReferenceWidth / 390).toBeLessThan(MaxPullback);
    expect(pulled).toBeCloseTo(authored * (ReferenceWidth / 390), 10);
    expect(Math.abs(pulled)).toBeGreaterThan(1.63);
});

test('a moderately narrow viewport pulls back proportionally, below the cap', () => {
    const pulled = responsiveZ(-10, 733, 2000);
    expect(pulled).toBeCloseTo(-10 * (ReferenceWidth / 733), 10);
});

test('a tall narrow viewport is judged by its width, not its smaller side', () => {
    // The reported failure: a stage 733x1150 is roomy by any combined measure, and its
    // SMALLER dimension is the generous one, so a min(width, height) reference left it
    // completely unadjusted while its content clipped horizontally.
    const pulled = responsiveZ(-10, 733, 1150);
    expect(pulled).toBeCloseTo(-10 * (ReferenceWidth / 733), 10);
    // And it must clear the 1.07x that case actually needed.
    expect(Math.abs(pulled) / 10).toBeGreaterThan(1.07);
});

test('a short viewport is rescued by its height', () => {
    // Width is fine here, so only the height reference can catch it.
    const pulled = responsiveZ(-10, 1600, 300);
    expect(pulled).toBeCloseTo(-10 * (ReferenceHeight / 300), 10);
});

test('an unmeasured viewport leaves the authored camera alone', () => {
    expect(responsiveZ(-12, 0, 280)).toBe(-12);
    expect(responsiveZ(-12, -10, 280)).toBe(-12);
    expect(responsiveZ(-12, 360, 0)).toBe(-12);
});
