/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests/end2end',
    /* Per-test budget. Bumped from Playwright's 30s default because WebKit on
     * the macOS nightly runner is ~2-3x slower than Chromium for Firestore
     * round-trips (the emulator WebChannel + auth restore), so cloud-assertion
     * tests (gallery-sharing, cloud-updates, feedback) blew the 30s budget.
     * Passing tests finish well under this, so it doesn't slow a green run. */
    timeout: 60_000,
    /* Run tests in files in parallel unless on CI */
    fullyParallel: !process.env.CI,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /**
     * Run spec files in parallel on CI. Two workers roughly halves wall-clock
     * here: the long files (collaborative-editing, offline-replay, seeded-load,
     * howto-form) distribute across workers. Kept at 2 to limit contention on
     * the single Firebase emulator each worker shares. Locally, let Playwright
     * pick based on CPU count.
     */
    workers: 2,
    /* Retry once on CI, never locally */
    retries: process.env.CI ? 1 : 0,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        [
            'html',
            {
                open: process.env.CI ? 'never' : 'always', // if on CI then "never" otherwise "always" show
            },
        ],
        [
            'list',
            {
                printSteps: process.env.CI, // if on CI, print the steps
            },
        ],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://127.0.0.1:5002',
        viewport: { width: 1280, height: 720 },
        /* Run every context with prefers-reduced-motion. The app's default
         * animationFactor is `null` ("follow the device"), so this turns
         * animations off (factor 0) — which keeps the animated typography from
         * defeating Playwright's click "stability" wait. That stall is what made
         * WebKit clicks time out (see the webkit project note below); it also
         * de-flakes Chromium. Set via contextOptions because this Playwright
         * version exposes reducedMotion there, not as a top-level use option. */
        contextOptions: { reducedMotion: 'reduce' },
        screenshot: 'only-on-failure',
        /* Collect a trace only when a test fails and is retried (retries:1 on
         * CI), so passing tests don't pay the per-action instrumentation and
         * per-test zip I/O. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        // WebKit (Safari engine) is worth covering: the app carries a lot of
        // Safari-specific handling (emoji/font fallbacks, editor IME/key
        // handling, Hand-tracking GC tuning) and serves an iPad/education
        // audience. It passes on real WebKit (macOS, ~4 min) but is unusable on
        // the Linux GitHub runners — Playwright's element-stability check never
        // settles against the app's animated typography, so every click times
        // out. So it does NOT run on PRs; the webkit-nightly workflow runs it on
        // a macOS runner, and developers can run it locally. Firefox was retired.
        // One extra CI retry beyond the global 1. The cloud-assertion specs
        // (gallery-sharing, feedback, collaborative-editing) occasionally blow
        // their 60s budget when both workers hit the single Firebase emulator at
        // once on the contended macOS runner — a transient that a further retry
        // clears. Local runs (retries 0) and chromium PRs (global retries 1) are
        // unaffected.
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            retries: process.env.CI ? 2 : 0,
        },
    ],

    /* Remove any lingering authentication state before starting the tests */
    webServer: {
        name: 'Vite build preview',
        command: '',
        url: 'http://127.0.0.1:5002',
        timeout: 180000,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
    },

    /* Seed the emulator with the full fixture set before tests run. */
    globalSetup: './tests/setup.ts',

    /* Clean stuff up after tests */
    globalTeardown: './tests/teardown.ts',
});
