import type { Page } from '@playwright/test';

/**
 * Record what a page said, and print it when an assertion fails.
 *
 * The WebKit nightly runs on macOS runners whose `test-results/` artifacts —
 * the screenshots, traces and `error-context.md` that would normally explain a
 * failure — are not reachable from every environment a maintainer might debug
 * from. The job log always is. So when a test that depends on cloud state
 * fails, dump the evidence into stdout, where the `list` reporter carries it
 * into the log: what the page was showing, and what the console said.
 *
 * Attach at the top of a test; call `dump` from a catch. Costs nothing on a
 * passing run beyond holding a bounded array of strings.
 */
export function recordPage(page: Page, keep = 40) {
    const messages: string[] = [];
    const note = (line: string) => {
        messages.push(line);
        if (messages.length > keep) messages.shift();
    };

    page.on('console', (m) =>
        note(`console[${m.type()}] ${m.text().slice(0, 300)}`),
    );
    page.on('pageerror', (e) => note(`pageerror ${e.message.slice(0, 300)}`));
    page.on('requestfailed', (r) =>
        note(
            `requestfailed ${r.failure()?.errorText} ${r.url().slice(0, 140)}`,
        ),
    );

    return async function dump(label: string) {
        // Read the DOM defensively: the page may be closed or navigating, and a
        // diagnostic that throws hides the failure it was meant to explain.
        let body = '(unavailable)';
        try {
            body = (await page.locator('body').innerText()).slice(0, 600);
        } catch {
            /* leave the placeholder */
        }
        console.log(
            [
                `\n===== ${label} =====`,
                `url: ${page.url()}`,
                `visible text:\n${body}`,
                `events (last ${messages.length}):`,
                ...messages,
                '===== end =====\n',
            ].join('\n'),
        );
    };
}
