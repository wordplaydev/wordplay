import { expect, test } from '@playwright/test';

declare global {
    interface Window {
        /** Set by this test's init script; counts animations built per frame. */
        __animationCounts: { animate: number; frames: number };
    }
}

/**
 * Output driven by physics or a @Motion stream moves every frame. Each move used
 * to cancel the running Web Animation and build a replacement, so a 250ms
 * animation was destroyed and recreated every ~16ms per moving output — work
 * the browser resolves during style recalculation, which dominated the CPU while
 * any program ran (~73% of it on Layers).
 *
 * Two changes fixed it. OutputAnimation retargets a running animation through
 * KeyframeEffect.setKeyframes rather than replacing it, and it doesn't tween at
 * all when the simulation is what computes the place — the element's own
 * transform already renders every frame of that.
 *
 * Measured on Layers: 30 animations built per frame, then 1.0, now 0.
 *
 * The pair of tests below is deliberate. The first proves the animations went
 * away; the second proves they went away for the right reason, because the
 * cheapest way to pass the first is to stop animating everything.
 */

/** The suite turns animation off globally to de-flake animated typography, but
 *  that sets the animation factor to 0, which builds no animations and moves no
 *  output — there would be nothing here to measure. */
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('output the simulation places builds no animations per frame', async ({
    page,
}) => {
    await page.addInitScript(() => {
        const counts = { animate: 0, frames: 0 };
        Object.defineProperty(window, '__animationCounts', { value: counts });
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
            counts.animate++;
            return animate.apply(this, args);
        };
        const raf = window.requestAnimationFrame.bind(window);
        const count = () => {
            counts.frames++;
            raf(count);
        };
        raf(count);
    });

    // Layers keeps 30 balls in continuous motion under gravity, so every one of
    // them is a moved output on every frame.
    await page.goto('/en-US/project/example-Layers?mode=play');
    await expect(page.locator('.stage.live')).toBeVisible();
    await expect(page.locator('[data-id^="output-"]').first()).toBeVisible();

    // Let it get past entry animations and into steady-state motion.
    await page.waitForTimeout(3000);
    const outputs = await page.locator('[data-id^="output-"]').count();
    expect(outputs).toBeGreaterThan(10);

    await page.evaluate(() => {
        const counts = window.__animationCounts;
        counts.animate = 0;
        counts.frames = 0;
    });
    const before = await sample();
    await page.waitForTimeout(3000);
    const after = await sample();
    const { animate, frames } = await page.evaluate(
        () => window.__animationCounts,
    );

    expect(frames).toBeGreaterThan(10);
    // 30 per frame originally and 1.0 with only retargeting; 0 now that a
    // simulated place doesn't tween. Set below 1 so falling back to either
    // earlier behavior fails, but not at 0, since an entrance or a resting
    // Sequence elsewhere on the stage may legitimately build one.
    expect(animate / frames).toBeLessThan(0.5);

    // The output is still moving, so the win isn't just a stalled stage.
    expect(
        Math.max(...after.map((y, i) => Math.abs(y - (before[i] ?? y)))),
    ).toBeGreaterThan(20);

    /** The vertical position of every rendered output. */
    async function sample(): Promise<number[]> {
        return page.$$eval('[data-id^="output-"]', (nodes) =>
            nodes.map((node) => node.getBoundingClientRect().top),
        );
    }
});

/**
 * The counterpart. BasketballStar's ball carries `matter:` so the physics engine
 * tracks it for collisions, but the *program* sets its place from the pointer.
 * That makes it a kinematic sensor, not a simulated body, and moving it is a
 * real move worth smoothing over the phrase's duration.
 *
 * This is the distinction the optimization rests on: "is in the physics world"
 * is much broader than "physics computes its place", and widening the check to
 * the former turns this slide — and FootBall's keeper, and Pears' Placement
 * steps — into teleports. Sampling *through* the move is what catches that; a
 * teleport still starts and ends in the same two places. Verified by mutation:
 * with the check widened to "has a body", the samples below collapse to 1.
 */
test('output that only has matter still tweens its moves', async ({ page }) => {
    await page.goto('/en-US/project/example-BasketballStar?mode=play');
    const ball = page.locator('[data-id="output-basketball"]');
    await expect(ball).toBeVisible();
    await page.waitForTimeout(2500);

    const x = async () => Math.round((await ball.boundingBox())?.x ?? -1);

    // Park the pointer, let the ball settle on it, then jump it across.
    await page.mouse.move(300, 400);
    await page.waitForTimeout(1200);
    const before = await x();
    await page.mouse.move(1000, 400);

    // Sample through the default 0.25s tween.
    const during: number[] = [];
    for (let i = 0; i < 12; i++) {
        during.push(await x());
        await page.waitForTimeout(25);
    }
    await page.waitForTimeout(600);

    // It followed the pointer...
    expect(await x()).toBeGreaterThan(before + 100);
    // ...passing through the places in between rather than jumping. A teleport
    // yields 1 distinct sample; the slide measures 5.
    expect(new Set(during).size).toBeGreaterThan(2);
});
