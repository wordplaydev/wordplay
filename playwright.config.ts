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
     * the single Firebase emulator each worker shares — and playwright.yml
     * passes `--workers` on the command line anyway, so this value only ever
     * decides a local run. It used to say 2 there too, which capped a
     * many-core machine at two browsers and made the full suite a coffee break.
     *
     * The shared resource is the single-process Firestore emulator, not the
     * cores, which is why this is a measured number rather than a fraction of
     * `os.cpus().length`. Measured on a 15-core machine over the eleven
     * cloud-assertion tests that contend hardest (gallery-sharing,
     * gallery-characters, howto-form): 2 workers failed 2, **4 failed 1**, and 7
     * failed 4. Past four, the Firestore round-trips these specs wait on start
     * timing each other out inside the 60s budget — the same contention the
     * WebKit project below already documents — and with `retries: 0` locally
     * that reads as a real failure rather than as load. So four, not "half the
     * cores": the machine has headroom the emulator does not.
     * PLAYWRIGHT_WORKERS overrides it either way — drop to 1 when a run looks
     * flaky rather than editing this, and raise it only with a measurement.
     */
    workers: process.env.PLAYWRIGHT_WORKERS
        ? Number(process.env.PLAYWRIGHT_WORKERS)
        : process.env.CI
          ? 2
          : 4,
    /* Retry once on CI, never locally */
    retries: process.env.CI ? 1 : 0,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters
     * The HTML report is written but never opened. `open: 'always'` launched a
     * browser window after every local run, green ones included, which is a
     * modal interruption in exchange for a report nobody asked for;
     * `npx playwright show-report` opens it on demand. CI overrides all of this
     * with `--reporter=list`. (`printSteps` is typed boolean and was being
     * handed `string | undefined`; it only compiled because the reporter
     * options tuple is loosely typed.) */
    reporter: [
        ['html', { open: 'never' }],
        ['list', { printSteps: !!process.env.CI }],
    ],
    /* Assertion budget. Playwright's 5s default is what drove the ~135 scattered
     * per-call `{ timeout: 15000 }` options in these specs, each one a place
     * someone noticed the app was slower than 5s there. A 10s global costs a
     * passing run nothing — an assertion polls until it passes — and only
     * lengthens a genuine failure, which retries once on CI. Prefer this over
     * adding another per-call option. */
    expect: { timeout: 10_000 },
    /* Name the specs that dominate a run. Playwright's default threshold is five
     * minutes, so it never fired and the shard imbalance stayed invisible; 20s is
     * about four ordinary tests, which is what a spec has to be worth. */
    reportSlowTests: { max: 15, threshold: 20_000 },
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
