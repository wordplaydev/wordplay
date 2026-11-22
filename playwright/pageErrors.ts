import { test as baseTest } from '@playwright/test';

export * from '@playwright/test';

/**
 * Browser and network conditions that WebKit (not Chromium) reports as a
 * `pageerror` without anything having thrown in our code:
 * - a resize callback that causes another resize, which a resizing editor full
 *   of animated typography does constantly;
 * - a request to an emulator cancelled by a navigation, which WebKit raises as
 *   an "access control checks" rejection from inside a Firebase SDK even when
 *   our code catches the call: Firestore's long-poll channel, and a callable
 *   (`usernameAvailable` on the profile page) in the Functions emulator;
 * - a module's CSS preload cut off by a navigation, as signing out reloads.
 */
const Benign = [
    /^ResizeObserver loop/,
    /Fetch API cannot load \S+\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel\b/,
    /Fetch API cannot load http:\/\/127\.0\.0\.1:5001\/demo-wordplay\/[\w-]+\/\w+ due to access control checks/,
    /Unable to preload CSS for /,
];

/**
 * Every spec's `test`: fails a test whose pages threw an uncaught exception,
 * and says what it was. Svelte 5.58.1 threw inside its own `{#each}` update,
 * which abandoned the rest of the update; five specs then failed as missing
 * content, with the one cause that explained all of them visible nowhere.
 */
export const test = baseTest.extend<{
    /** Set by a test that provokes an uncaught error on purpose. */
    allowPageErrors: boolean;
    pageErrorGuard: void;
}>({
    allowPageErrors: [false, { option: true }],
    pageErrorGuard: [
        async ({ context, allowPageErrors }, use) => {
            const errors: string[] = [];
            const watch = (page: import('@playwright/test').Page) =>
                page.on('pageerror', (error) => {
                    // WebKit sometimes leaves the message empty and puts the text in the stack.
                    const text = `${error.message}\n${error.stack ?? ''}`;
                    if (Benign.some((pattern) => pattern.test(text))) return;
                    // WebKit leaves the stack empty on some errors.
                    errors.push(
                        `${page.url()}\n${error.stack || error.message || String(error)}`,
                    );
                });
            context.pages().forEach(watch);
            context.on('page', watch);

            await use();

            if (errors.length > 0 && !allowPageErrors)
                throw new Error(
                    `The page threw ${errors.length} uncaught exception${errors.length === 1 ? '' : 's'}:\n\n${errors.slice(0, 5).join('\n\n')}`,
                );
        },
        { auto: true },
    ],
});
