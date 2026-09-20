/// <reference types="node" />
import { defineConfig } from '@playwright/test';

/**
 * The UI contact sheet: a screenshot of every surface, in both color schemes,
 * assembled into a review page.
 *
 * Its own config rather than a spec under `tests/end2end`, because
 * `playwright.config.ts` has `testDir: './tests/end2end'` and anything dropped
 * there joins the CI gate — minutes added to a three-shard run for something
 * that asserts nothing. This is a review instrument, run by hand twice: once
 * before a round of UI work and once after.
 *
 * Output goes outside the repo (see CONTACT_SHEET_OUT in capture.spec.ts).
 */
export default defineConfig({
    testDir: './tests/contactsheet',
    /* A capture navigates, waits for content, and shoots twice. The generous
     * budget is for the authed surfaces, which sign in through the worker
     * fixture and then wait on Firestore. */
    timeout: 120_000,
    fullyParallel: false,
    /* Never retry: a flaky capture should be seen and re-run, not silently
     * replaced by a second attempt that may differ visually. */
    retries: 0,
    /* Two, not four: the shared resource is the single-process Firestore
     * emulator, and this run is I/O-bound on screenshot writes anyway. */
    workers: 2,
    reporter: [['list']],
    expect: { timeout: 10_000 },
    use: {
        baseURL: 'http://127.0.0.1:5002',
        /* Declared directly rather than by spreading a `devices` preset: a
         * preset carries its own viewport and would silently override this one.
         *
         * Tall, because the app scrolls in its own region — app.html sets
         * `html, body, #wordplay-app { height: 100%; overflow: hidden }` — so
         * `fullPage` captures exactly one viewport and silently truncates.
         * A taller window is the only thing that shows more of a surface. */
        browserName: 'chromium',
        viewport: { width: 1280, height: 1800 },
        /* Matches the main config: the app's default animationFactor follows
         * the device, so this turns animations off and makes a shot of animated
         * typography deterministic. */
        contextOptions: { reducedMotion: 'reduce' },
        screenshot: 'off',
        trace: 'off',
    },
    /* Same fixture set the accessibility specs scan, so a tile shows the same
     * seeded content a reviewer would see there. */
    globalSetup: './tests/setup.ts',
});
