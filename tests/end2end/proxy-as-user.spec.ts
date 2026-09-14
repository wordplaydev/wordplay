import { expect, test } from '../../playwright/fixtures';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * Looking at Wordplay as another creator, read-only (#1313).
 *
 * Three claims a browser is the only place to check, because all three are
 * about two tabs of one origin rather than about any one page:
 *
 *   - the proxy session lands in a *new tab* signed in as somebody else, while
 *     the administrator's own tab keeps its own account. Firebase Auth is one
 *     session per origin by default, so getting this wrong signs the
 *     administrator out of their own account everywhere.
 *   - that tab keeps its own local database, so nothing of that creator's can
 *     reach the administrator's cache. Asserted as the database's existence
 *     rather than as data loss, and the reason is worth writing down: with the
 *     read-only guards in place *nothing writes locally either*, so an
 *     assertion about lost or leaked projects passes with the separate database
 *     removed. Two earlier drafts of this test did exactly that. The split is
 *     defence in depth behind the read-only guards, and this pins that it is
 *     still there for the day those are relaxed.
 *
 * Each of the three assertions was checked by breaking the thing it is about
 * and watching it fail — which is the only reason the first two are worth
 * anything, since both passed against a deliberately broken build first.
 *   - the banner says so, and cannot be dismissed.
 *
 * Deliberately one test with three assertions rather than three tests: each
 * Playwright test costs a page load and a sign-in, and every claim here needs
 * the same two tabs open at the same time.
 */

const LOAD_TIMEOUT = 30_000;

/** How many projects the administrator's own local database holds. Counted
 *  through IndexedDB rather than through the UI, because what is at stake is
 *  the durable cache, not what a list happens to render. */
/** The IndexedDB databases this tab can see. */
async function databases(
    page: import('@playwright/test').Page,
): Promise<string[]> {
    return page.evaluate(async () =>
        (await indexedDB.databases())
            .map((database) => database.name ?? '')
            .filter((name) => name.startsWith('wordplay')),
    );
}

async function localProjects(
    page: import('@playwright/test').Page,
    database: string,
): Promise<number> {
    return page.evaluate(
        (name) =>
            new Promise<number>((resolve) => {
                const open = indexedDB.open(name);
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains('projects'))
                        return resolve(0);
                    const count = db
                        .transaction('projects')
                        .objectStore('projects')
                        .count();
                    count.onsuccess = () => resolve(count.result);
                    count.onerror = () => resolve(-1);
                };
                open.onerror = () => resolve(-1);
            }),
        database,
    );
}

test('an administrator looks as a creator without losing their own session', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'admin',
        'password',
    );
    try {
        // Make a project first, so there is something to lose. Without this the
        // count is zero on both sides and the assertion at the end holds however
        // broken the isolation is — which is exactly what happened to the first
        // draft of this test: it passed with the separate database removed.
        await page.goto('/en-US/projects');
        await expect(page.getByTestId('addproject')).toBeVisible({
            timeout: LOAD_TIMEOUT,
        });
        await page.getByTestId('addproject').click();
        await page.waitForURL(/\/project\//, { timeout: LOAD_TIMEOUT });
        // Let the new project reach the local cache before navigating away:
        // leaving immediately aborts the save, and then the count below is zero
        // and the whole test means nothing.
        await expect
            .poll(() => localProjects(page, 'wordplay'), {
                timeout: LOAD_TIMEOUT,
            })
            .toBeGreaterThan(0);
        await page.goto('/en-US/projects');
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: LOAD_TIMEOUT,
        });
        const before = await localProjects(page, 'wordplay');

        await page.goto('/en-US/admin');
        const lookup = page.locator('#creator-to-look-as');
        await expect(lookup).toBeVisible({ timeout: LOAD_TIMEOUT });
        // `creator` rather than `teacher`, because `creator` has seeded
        // projects: with one shared database those would land in the
        // administrator's cache, and with two they cannot. A creator with
        // nothing to cache would make the count below hold either way.
        await lookup.fill('creator');

        // The session opens in a tab of its own; `noopener` keeps it from
        // inheriting this tab's session storage, and it still belongs to this
        // context, so the page event is how we catch it.
        const opening = context.waitForEvent('page', { timeout: LOAD_TIMEOUT });
        await page.keyboard.press('Enter');
        const proxy = await opening;
        await proxy.waitForLoadState('domcontentloaded');

        // It says whose account this is, throughout, with no way to dismiss it.
        const banner = proxy.getByTestId('app-banner');
        await expect(banner).toBeVisible({ timeout: LOAD_TIMEOUT });
        await expect(banner).toContainText(/creator/);

        // The token is a bearer credential for somebody else's account, and it
        // must not be left in the address bar or in history.
        expect(proxy.url()).not.toContain('#');

        // Two tabs, two accounts, at the same time. The administrator's own tab
        // is untouched — this is the assertion that fails if the proxy session
        // ever shares the origin's one Auth session.
        await page.reload();
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: LOAD_TIMEOUT,
        });
        await expect(page.locator('body')).toContainText(/admin/);

        // The proxy tab reads and writes a database of its own.
        await expect
            .poll(() => databases(proxy), { timeout: LOAD_TIMEOUT })
            .toContain('wordplay-proxy');

        // And the administrator's own cache still holds what it held. This is
        // what fails if the proxy ever shares the origin's one Auth session:
        // *their* tab is switched to the other account, and that switch is what
        // fires the wipe — verified by removing the per-tab persistence and
        // watching this go to zero.
        await page.goto('/en-US/projects');
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: LOAD_TIMEOUT,
        });
        expect(await localProjects(page, 'wordplay')).toBe(before);
        expect(before).toBeGreaterThan(0);
    } finally {
        await context.close();
    }
});
