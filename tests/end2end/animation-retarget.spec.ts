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
 * any program ran (~73% of it on this example).
 *
 * OutputAnimation now retargets the running animation instead, via
 * KeyframeEffect.setKeyframes. The animation still finishes and restarts once
 * per duration, so this asserts a *rate* well under one call per frame rather
 * than zero — and asserts the output still moves, since the cheapest way to pass
 * the first half would be to stop animating altogether.
 *
 * Measured on this example: 30 animations built per frame before, 1.9 after.
 */

/** The suite turns animation off globally to de-flake animated typography, but
 *  that sets the animation factor to 0, which builds no animations and moves no
 *  output — there would be nothing here to measure. */
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('a moving output retargets its animation instead of rebuilding it', async ({
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
    // 30 per frame before this change, 1.9 after — the threshold sits well
    // clear of both so it fails on a regression, not on a slow machine.
    expect(animate / frames).toBeLessThan(6);

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
