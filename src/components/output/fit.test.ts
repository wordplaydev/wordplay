import { expect, test } from 'vitest';
import fitZ, {
    MaxPullback,
    NaturalSizeZ,
    ReferenceHeight,
    ReferenceWidth,
    CameraGap,
    MaxZoomOut,
    MinVisiblePixels,
    MinZoomIn,
    ZoomGaugeEase,
    ZoomStep,
    boundZoom,
    composeZoom,
    contentVisibility,
    growEnvelope,
    refit,
    responsiveZ,
    zoomBySteps,
    zoomByWheel,
    zoomGauge,
    zoomPercent,
    type Box,
    type Focus,
    type ZoomLimits,
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

/** A viewport-sized fit of the given bounds, from nothing framed yet. */
function firstFit(bounds: Box) {
    return refit(undefined, bounds, 360, 280, undefined);
}

test('content that arrives after the first fit is framed', () => {
    // The camera regression. A @Camera's first value is an empty frame, so the stage a
    // project is first fit to is not the stage it plays: fitting once at startup left the
    // camera pointing at the origin at natural size for as long as the project ran.
    const empty = firstFit(box(0, 0, 0, 0));
    expect(empty?.focus?.z).toBe(NaturalSizeZ);

    const arrived = refit(
        empty?.framing,
        box(-10, 0, -9.5, 0),
        360,
        280,
        empty?.focus,
    );
    expect(arrived).toBeDefined();
    expect(arrived?.focus?.z).not.toBe(empty?.focus?.z);
    // And it points at the middle of what arrived.
    expect(arrived?.focus?.x).toBeCloseTo(5, 10);
    expect(arrived?.focus?.y).toBeCloseTo(-4.75, 10);
});

test('a stage that has not changed leaves the camera alone', () => {
    const bounds = box(-4, 4, -3, 3);
    const first = firstFit(bounds);
    expect(first).toBeDefined();
    expect(
        refit(first?.framing, bounds, 360, 280, first?.focus),
    ).toBeUndefined();
});

test('a settled frame stops producing fits however long it runs', () => {
    // Every stage change re-runs this, so a settled frame that kept reporting a fit would
    // restart the camera's ease on every frame of every animated project.
    const bounds = box(-4, 4, -3, 3);
    const first = firstFit(bounds);
    for (let i = 0; i < 500; i++)
        expect(
            refit(first?.framing, box(-1, 1, -1, 1), 360, 280, first?.focus),
        ).toBeUndefined();
});

test('a viewport resize refits content that has not moved', () => {
    // The bail is about content that didn't change, not about the window that did.
    const bounds = box(-4, 4, -3, 3);
    const first = firstFit(bounds);
    const resized = refit(first?.framing, bounds, 720, 560, first?.focus);
    expect(resized?.focus?.z).not.toBe(first?.focus?.z);
});

test('the first frame with extent is snapped to rather than eased into', () => {
    // There is no camera move to make smooth when nothing was on screen to move from, and
    // the state it would ease from is an artifact of the stage being empty at startup.
    const empty = firstFit(box(0, 0, 0, 0));
    expect(empty?.opening).toBe(false);

    const arrived = refit(
        empty?.framing,
        box(-10, 0, -9.5, 0),
        360,
        280,
        empty?.focus,
    );
    expect(arrived?.opening).toBe(true);

    // Later growth is a camera move like any other, so it eases.
    const grown = refit(
        arrived?.framing,
        box(-12, 2, -9.5, 0),
        360,
        280,
        arrived?.focus,
    );
    expect(grown?.opening).toBe(false);
});

test('a frame that grows keeps refitting until it settles', () => {
    // The Follow Me shape, through the whole decision rather than growEnvelope alone: fits
    // keep coming while the pointer explores, and stop entirely once it has been everywhere.
    let framing: Box | undefined = undefined;
    let focus: Focus | undefined = undefined;
    const fits: boolean[] = [];
    const laps = 3;
    const steps = 40;

    for (let i = 0; i < laps * steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const next = refit(
            framing,
            followBounds(Math.cos(angle) * 4, Math.sin(angle) * 4),
            360,
            280,
            focus,
        );
        fits.push(next !== undefined);
        if (next) {
            framing = next.framing;
            focus = next.focus;
        }
    }

    expect(fits.slice(0, steps).some((fit) => fit)).toBe(true);
    expect(fits.slice(-steps).some((fit) => fit)).toBe(false);
});

test('an unmeasured viewport remembers the content it saw', () => {
    // The first stage render happens before the ResizeObserver reports, and content seen
    // then is still content the frame has to cover once there's a viewport to fit into.
    const unmeasured = refit(
        undefined,
        box(-10, 10, -10, 10),
        0,
        280,
        undefined,
    );
    expect(unmeasured?.focus).toBeUndefined();
    expect(unmeasured?.framing).toEqual(box(-10, 10, -10, 10));

    const measured = refit(
        unmeasured?.framing,
        box(-1, 1, -1, 1),
        360,
        280,
        undefined,
    );
    expect(measured?.focus?.z).toBe(fitZ(20, 20, 360, 280));
});

test('the fit points the camera at the middle of the frame', () => {
    // x is negated because moving the camera right moves the world left; getting this
    // backwards centers the stage on the mirror image of its content.
    const fit = firstFit(box(-8, 2, -6, 0));
    expect(fit?.focus?.x).toBeCloseTo(3, 10);
    expect(fit?.focus?.y).toBeCloseTo(-3, 10);
});

/** The bases the zoom laws have to hold at: a near authored camera, a middle one, the
 *  default fit, and one far out. */
const Bases = [-0.25, -1, -12, -112];

/** Limits for a camera looking at content on the stage plane, which is where content lives
 *  unless a project says otherwise. */
function at(baseZ: number, nearestContentZ = 0): ZoomLimits {
    return { baseZ, nearestContentZ };
}

/** How many clicks out the far bound is. */
const StepsToBound = Math.ceil(Math.log(MaxZoomOut) / Math.log(ZoomStep));

test('the audience zoom composes onto the base rather than replacing it', () => {
    // The Heart Attack regression: a zoom used to replace the whole camera, freezing the
    // program's motion. With an adjustment composed on top, a moving base still moves.
    expect(composeZoom(at(-1), 0.5)).not.toBe(composeZoom(at(-1.5), 0.5));
    // A ratio means the same thing at every base: half the size, wherever the camera is.
    for (const base of Bases)
        expect(scaleAt(composeZoom(at(base), 0.5)) / scaleAt(base)).toBeCloseTo(
            0.5,
            10,
        );
});

test('one click out is one click in, wherever the camera is', () => {
    // #1175: steps used to be a fixed distance in metres while scale is FOCAL_LENGTH / -z,
    // so a click out from -2m cost a third of the picture and a click back in at -112m
    // bought under a percent of it. One trackpad flick could strand a viewer hundreds of
    // clicks from home. A ratio makes the pair cancel exactly, at every base.
    for (const base of Bases) {
        expect(zoomBySteps(at(base), zoomBySteps(at(base), 1, -1), 1)).toBe(1);
        expect(zoomBySteps(at(base), zoomBySteps(at(base), 1, -5), 5)).toBe(1);
        // And every click is the same size, which is what makes them countable.
        expect(
            scaleAt(composeZoom(at(base), zoomBySteps(at(base), 1, -1))) /
                scaleAt(base),
        ).toBeCloseTo(1 / ZoomStep, 10);
    }
});

test('a zoom survives the program moving its own camera', () => {
    // The reason the adjustment is a ratio rather than a distance. A viewer who zooms out
    // at -1m and clicks back in after the program has dollied to -10m must land home; with
    // metres their adjustment silently evaporated as the base moved.
    const out = zoomBySteps(at(-1), 1, -3);
    expect(zoomBySteps(at(-10), out, 3)).toBe(1);
    // And what they see is theirs to keep while the program moves.
    expect(scaleAt(composeZoom(at(-10), out)) / scaleAt(-10)).toBeCloseTo(
        scaleAt(composeZoom(at(-1), out)) / scaleAt(-1),
        10,
    );
});

test('the audience cannot push the camera into the output plane', () => {
    expect(composeZoom(at(-12), 1000)).toBe(-CameraGap);
    expect(composeZoom(at(-12), 1)).toBe(-12);
});

test('the near bound leaves no dead zone', () => {
    // The stored ratio is bounded, not just the rendered one. Letting it accumulate past
    // the clamp meant ten clicks in and one click out did nothing visible.
    let zoom = 1;
    for (let i = 0; i < 40; i++) zoom = zoomBySteps(at(-12), zoom, 1);
    const pinned = composeZoom(at(-12), zoom);
    expect(pinned).toBe(-CameraGap);
    expect(composeZoom(at(-12), zoomBySteps(at(-12), zoom, -1))).toBeLessThan(
        pinned,
    );
});

test('one wheel event out of the near bound moves the picture', () => {
    // The reported symptom, as a test. Scroll hard into the bound, then a *single* event
    // in the other direction has to change what is drawn — anything else is travel the
    // viewer spends on a number they cannot see.
    let zoom = 1;
    for (let i = 0; i < 60; i++) zoom = zoomByWheel(at(-12), zoom, -240, 0);
    const pinned = composeZoom(at(-12), zoom);
    expect(pinned).toBe(-CameraGap);
    expect(
        composeZoom(at(-12), zoomByWheel(at(-12), zoom, 120, 0)),
    ).toBeLessThan(pinned);
});

test('a bound that moves under the audience re-bounds the stored zoom', () => {
    // The residual dead zone, and why StageView re-bounds continuously rather than only
    // when a gesture writes. Saturate against a far base, then bring the base in: the
    // ceiling drops, and the stored ratio has to drop with it instead of banking travel
    // that the picture already refuses to show.
    let zoom = 1;
    for (let i = 0; i < 60; i++) zoom = zoomByWheel(at(-100), zoom, -240, 0);
    expect(zoom).toBeGreaterThan(boundZoom(at(-12), Number.MAX_VALUE));
    expect(boundZoom(at(-12), zoom)).toBe(boundZoom(at(-12), Number.MAX_VALUE));
    // Re-bounded, one event out moves the picture immediately.
    const rebounded = boundZoom(at(-12), zoom);
    expect(
        composeZoom(at(-12), zoomByWheel(at(-12), rebounded, 120, 0)),
    ).toBeLessThan(composeZoom(at(-12), rebounded));
});

test('the near bound follows the nearest thing on stage', () => {
    // The whole point of #3: -0.5 was really "0 - 0.5" under an unstated assumption that
    // content sits on the stage plane. Stated as a gap, the rule follows the content.

    // Content on the plane: the camera comes within CameraGap of it.
    expect(composeZoom(at(-12, 0), 1000)).toBe(-CameraGap);
    // 64x natural size, where the old flat bound was 16x whatever was on stage.
    expect(scaleAt(composeZoom(at(-12, 0), 1000))).toBe(64);

    // Content placed forward: the camera stops in front of it, so it stays visible
    // instead of being culled by `place.z > focus.z`.
    const forward = composeZoom(at(-12, -2), 1000);
    expect(forward).toBe(-2 - CameraGap);
    expect(-2).toBeGreaterThan(forward);
});

test('one output placed far forward cannot lock zoom out entirely', () => {
    // Without a floor the camera would have to stay behind z = -11, leaving almost nothing
    // to magnify. The floor wins instead, and that output does pass behind the camera —
    // which is what the off-stage hint is for.
    const limits = at(-12, -11);
    expect(boundZoom(limits, Number.MAX_VALUE)).toBe(MinZoomIn);
    expect(
        scaleAt(composeZoom(limits, Number.MAX_VALUE)) / scaleAt(-12),
    ).toBeCloseTo(MinZoomIn, 10);
});

test('content behind the stage plane still leaves a camera that renders', () => {
    // A stage whose content is all behind the plane would solve to a positive z, where
    // rootScale is 0 and nothing draws at all.
    expect(composeZoom(at(-12, 2), 1000)).toBe(-CameraGap);
    // And a stage with nothing placed at all reports Infinity, which must not propagate.
    expect(composeZoom(at(-12, Infinity), 1000)).toBe(-CameraGap);
});

test('a program nearer than the bound keeps its own camera', () => {
    // The bound constrains the audience, not the program: a camera already nearer than
    // anything the audience could reach is left exactly as authored.
    expect(composeZoom(at(-0.05), 1)).toBe(-0.05);
    expect(composeZoom(at(-0.05), 1000)).toBe(-0.05);
    // Zooming out of it still works; only coming nearer is refused.
    expect(composeZoom(at(-0.05), 0.5)).toBeLessThan(-0.05);
});

test("zooming out is capped at the project's own framing", () => {
    // This assertion used to read "zooming out is never capped", on the grounds that it
    // was trivially reversible. That is true of the metres and false of the clicks, which
    // is the only currency the audience spends — so the bound is stated in ratio, and what
    // it buys is that home is always a countable number of clicks away.
    let zoom = 1;
    for (let i = 0; i < 200; i++) zoom = zoomBySteps(at(-12), zoom, -1);
    expect(zoom).toBe(1 / MaxZoomOut);
    expect(scaleAt(composeZoom(at(-12), zoom))).toBeCloseTo(
        scaleAt(-12) / MaxZoomOut,
        10,
    );
    // From the far bound, that countable number of clicks lands exactly home. The bound is
    // not a power of the step, so without a detent at home the way back walked a lattice
    // offset from where the viewer started and skipped 100% entirely.
    expect(StepsToBound).toBe(19);
    let back = zoom;
    for (let i = 0; i < StepsToBound; i++) back = zoomBySteps(at(-12), back, 1);
    expect(back).toBe(1);
    // And one more click carries on past home rather than sticking to it.
    expect(zoomBySteps(at(-12), back, 1)).toBeCloseTo(ZoomStep, 10);
    // Monotonic all the way out to the bound.
    let previous = 1;
    for (let i = 0; i < StepsToBound; i++) {
        const next = zoomBySteps(at(-12), previous, -1);
        expect(next).toBeLessThan(previous);
        previous = next;
    }
});

test('a camera with no depth still zooms out instead of magnifying', () => {
    // rootScale is 1 at exactly 0 and 0 beyond it, with a pole in between, so a program
    // authoring Place(0m 0m 0m) used to have its audience's first zoom *out* magnify by 8x.
    for (const base of [0, 1]) {
        const out = composeZoom(at(base), zoomBySteps(at(base), 1, -1));
        expect(scaleAt(out)).toBeLessThan(1);
        expect(scaleAt(out)).toBeCloseTo(1 / ZoomStep, 10);
    }
});

test('no adjustment is the base camera itself', () => {
    // Not merely a z that renders at the same scale: output at other depths projects
    // differently, and the view's own no-op check compares the place identically.
    for (const base of [...Bases, 0, 1])
        expect(composeZoom(at(base), 1)).toBe(base);
    // Stepping out and back lands a few float ulps from 1, which must still read as home
    // or the reset control stays lit with nothing to clear.
    expect(boundZoom(at(-12), 1 + 1e-12)).toBe(1);
});

test('a nonsense zoom is ignored rather than obeyed', () => {
    // Falling back to the near bound would turn an infinite zoom-out into maximum zoom-in;
    // handing the camera back is the sane recovery.
    for (const nonsense of [Number.NaN, Infinity, -Infinity, 0, -1])
        expect(composeZoom(at(-12), nonsense)).toBe(-12);
});

test('a wheel flick undoes itself, however the wheel reports its delta', () => {
    // deltaMode matters: a mouse reporting lines rather than pixels sends about 3 per
    // notch, which read as pixels was no zoom at all.
    // A comparable flick in each unit, since 120 pages would saturate the bound.
    for (const [mode, delta] of [
        [0, 120],
        [1, 8],
        [2, 0.15],
    ]) {
        const out = zoomByWheel(at(-12), 1, delta, mode);
        expect(out).toBeLessThan(1);
        expect(out).toBeGreaterThan(1 / MaxZoomOut);
        expect(zoomByWheel(at(-12), out, -delta, mode)).toBeCloseTo(1, 9);
    }
    // A line or page delta must move more than the same number read as pixels.
    expect(zoomByWheel(at(-12), 1, 3, 1)).toBeLessThan(
        zoomByWheel(at(-12), 1, 3, 0),
    );
    // Monotonic in the delta.
    let previous = 1;
    for (let delta = 50; delta <= 500; delta += 50) {
        const next = zoomByWheel(at(-12), 1, delta, 0);
        expect(next).toBeLessThan(previous);
        previous = next;
    }
});

test('every step from home to the bound announces a different level', () => {
    // An announcement whose text repeats between two firings is heard once and then is
    // silent, so the percent has to actually differ at every step — including the far end,
    // where whole percents would collide.
    const levels = [];
    let zoom = 1;
    for (let i = 0; i <= StepsToBound; i++) {
        levels.push(zoomPercent(zoom));
        zoom = zoomBySteps(at(-12), zoom, -1);
    }
    expect(new Set(levels).size).toBe(levels.length);
    expect(levels[0]).toBe(100);
    expect(levels[1]).toBe(80);
});

/** Content of the given size in metres, centred on the origin. */
function content(width: number, height: number): Box {
    return {
        left: -width / 2,
        right: width / 2,
        top: height / 2,
        bottom: -height / 2,
    };
}

/** The camera fitting that content into a 1000x800 viewport, with the audience's zoom. */
function cameraFor(bounds: Box, zoom = 1): Focus {
    const z = fitZ(
        bounds.right - bounds.left,
        bounds.top - bounds.bottom,
        1000,
        800,
    );
    return { x: 0, y: 0, z: composeZoom(at(z ?? NaturalSizeZ), zoom) };
}

test('content the camera is framing counts as visible', () => {
    const bounds = content(4, 3);
    expect(contentVisibility(bounds, cameraFor(bounds), 1000, 800)).toBe(
        'visible',
    );
    // Content larger than the viewport is still visible — the viewer is inside it.
    expect(contentVisibility(bounds, { x: 0, y: 0, z: -1 }, 1000, 800)).toBe(
        'visible',
    );
});

test('the far bound is close enough in that framed content stays visible', () => {
    // What MaxZoomOut is calibrated for: content the stage framed is still something to
    // look at even at the very end of the zoom-out, so an audience cannot zoom themselves
    // into an empty stage at all. Losing the content entirely takes panning, which is why
    // the off-stage hint is about more than zoom.
    const bounds = content(4, 3);
    expect(
        contentVisibility(bounds, cameraFor(bounds, 1 / MaxZoomOut), 1000, 800),
    ).toBe('visible');
});

test('content too small to see is not visible', () => {
    // A camera a program authored far back, with little content to find there: under
    // MinVisiblePixels on both axes there is nothing to look at, however honest the render.
    const speck = content(0.02, 0.02);
    expect(contentVisibility(speck, { x: 0, y: 0, z: -100 }, 1000, 800)).toBe(
        'infinitesimal',
    );
});

test('content panned past the edge is not visible', () => {
    const bounds = content(4, 3);
    const camera = cameraFor(bounds);
    expect(
        contentVisibility(
            { ...bounds, left: bounds.left + 100, right: bounds.right + 100 },
            camera,
            1000,
            800,
        ),
    ).toBe('offscreen');
});

test('a hairline is a picture, and an unmeasured stage is not a verdict', () => {
    // Both axes must be sub-pixel, not either: a line 1px wide and 300px tall is still
    // something to look at. At natural size a metre is PX_PER_METER pixels.
    const hairline = content(1 / PX_PER_METER, 300 / PX_PER_METER);
    expect(
        contentVisibility(hairline, { x: 0, y: 0, z: NaturalSizeZ }, 1000, 800),
    ).toBe('visible');
    // Nothing measured, and nothing to frame, are both silence rather than a complaint.
    expect(contentVisibility(content(4, 3), { x: 0, y: 0, z: -12 }, 0, 0)).toBe(
        'visible',
    );
    expect(
        contentVisibility(content(0, 0), { x: 0, y: 0, z: -12 }, 1000, 800),
    ).toBe('visible');
});

test('content exactly touching an edge is still visible', () => {
    // Half a viewport wide at natural size lands its right edge exactly on the centre-
    // measured half-width; an off-by-one here would nag at content in full view.
    const bounds = content(1000 / PX_PER_METER, 4 / PX_PER_METER);
    expect(
        contentVisibility(bounds, { x: 0, y: 0, z: NaturalSizeZ }, 1000, 800),
    ).toBe('visible');
    expect(MinVisiblePixels).toBe(4);
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

/** The gauge's track, in pixels: `--wordplay-widget-height` is 1.5em at the small font
 *  size, which is 20px. The tests below are about what a viewer can actually see move. */
const GaugeTrack = 20;

test("the gauge puts the project's own view at its centre line", () => {
    // The whole premise of the control: the line across the middle is home.
    expect(zoomGauge(1)).toBe(0.5);
});

test('the gauge spans its scale and clamps beyond it', () => {
    expect(zoomGauge(1 / MaxZoomOut)).toBeCloseTo(0, 10);
    expect(zoomGauge(MaxZoomOut)).toBeCloseTo(1, 10);
    // A project whose ceiling exceeds the scale pins at the top rather than overflowing.
    expect(zoomGauge(MaxZoomOut * 100)).toBe(1);
    expect(zoomGauge(1 / (MaxZoomOut * 100))).toBe(0);
    // Nonsense reads as home rather than as an end of the track.
    for (const nonsense of [Number.NaN, Infinity, 0, -1])
        expect(zoomGauge(nonsense)).toBe(0.5);
});

test('the gauge rises with the zoom, everywhere', () => {
    let previous = -1;
    for (let steps = -25; steps <= 25; steps++) {
        const level = zoomGauge(Math.pow(ZoomStep, steps));
        expect(level).toBeGreaterThanOrEqual(previous);
        previous = level;
    }
});

test('one click off home visibly moves the gauge', () => {
    // The reason the gauge is eased rather than proportional. The zoom range is about
    // thirteen doublings, so drawn proportionally a click moves half a pixel — no feedback
    // at all. This asserts the pixels directly, so easing it back to linear fails here
    // rather than shipping a control that looks broken.
    const home = zoomGauge(1) * GaugeTrack;
    const oneOut = zoomGauge(1 / ZoomStep) * GaugeTrack;
    const oneIn = zoomGauge(ZoomStep) * GaugeTrack;
    expect(home - oneOut).toBeGreaterThan(2);
    expect(oneIn - home).toBeGreaterThan(2);

    // What it would be without the easing, for comparison: under a pixel.
    const linear =
        0.5 * GaugeTrack -
        (0.5 + 0.5 * (Math.log(1 / ZoomStep) / Math.log(MaxZoomOut))) *
            GaugeTrack;
    expect(linear).toBeLessThan(1);
    expect(ZoomGaugeEase).toBeLessThan(1);
});

test('a project with little room to zoom cannot fill the gauge', () => {
    // Honest rather than flattering: the scale is fixed, so a ceiling of MinZoomIn shows as
    // a partly filled track instead of pretending to be fully zoomed in.
    const level = zoomGauge(MinZoomIn);
    expect(level).toBeGreaterThan(0.5);
    expect(level).toBeLessThan(1);
});
