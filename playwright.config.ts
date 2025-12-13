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
    /* Retry once on CI, never locally */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        [
            'html',
            {
                open: process.env.CI ? 'never' : 'always', // if on CI then "never" otherwise "always" show
            },
        ],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:4173',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
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
        command: 'rm -rf playwright/.auth && npm run preview',
        url: 'http://localhost:4173/',
        timeout: 180000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
