import { expect, test } from '@playwright/test';

/**
 * The content-warning gate has to fit whatever output view it covers. The
 * guide's inline examples are the small end of that range (roughly 240x180),
 * and the gate used to overflow them and clip its own Start button off screen.
 *
 * This concept gates because `analyzeSource`'s RiskyAnimations table maps
 * `shake` to a motion risk on any reference (PhotosensitivityAnalysis.ts), and
 * the shake doc's second paragraph holds nothing but that example, which
 * SegmentHTMLView renders as an evaluated ExampleUI -> OutputPreview ->
 * StartGate. If a doc edit ever un-gates it, this test stops finding the gate;
 * any other Sequence entry in RiskyAnimations (flash, wiggle, pulse) works.
 */
test('the gate fits a small guide preview and its Start button is reachable', async ({
    page,
}) => {
    await page.goto('/en-US/guide?concept=Sequence/shake');

    const gate = page.locator('[data-uiid="start-gate"]').first();
    // Hydration can be slow; matches the accessibility sweep's budget.
    await expect(gate).toBeVisible({ timeout: 15000 });

    const start = page.getByTestId('start-gate-start').first();
    await expect(start).toBeVisible();

    const gateBox = await gate.boundingBox();
    const startBox = await start.boundingBox();
    expect(gateBox).not.toBeNull();
    expect(startBox).not.toBeNull();
    if (gateBox === null || startBox === null) return;

    // The button must lie inside the gate, which is inset: 0 on the clipping
    // box — so containment here means it isn't clipped out of the output view.
    // A pixel of slack absorbs subpixel layout rounding.
    const slack = 1;
    expect(startBox.x).toBeGreaterThanOrEqual(gateBox.x - slack);
    expect(startBox.y).toBeGreaterThanOrEqual(gateBox.y - slack);
    expect(startBox.x + startBox.width).toBeLessThanOrEqual(
        gateBox.x + gateBox.width + slack,
    );
    expect(startBox.y + startBox.height).toBeLessThanOrEqual(
        gateBox.y + gateBox.height + slack,
    );

    // No force: Playwright's actionability check requires the button's center to
    // actually receive pointer events, which is what the clipping broke.
    await start.click();
    await expect(gate).toHaveCount(0);
});
