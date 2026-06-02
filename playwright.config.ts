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
        screenshot: 'only-on-failure',
        /* Collect a trace only when a test fails and is retried (retries:1 on
         * CI), so passing tests don't pay the per-action instrumentation and
         * per-test zip I/O. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        // Temporarily broken.
        // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
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
