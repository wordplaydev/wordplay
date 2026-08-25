import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Interface chrome is not selectable; content is.
 *
 * Selection is off globally (`user-select: none` on `html` in app.html) and
 * opted back in for the few things worth copying: markup prose, headings,
 * ValueView output, creator names, and form fields. Before that, a select-all
 * on the project view raked in tile names, toolbar labels, and footer links.
 *
 * This is invisible CSS spread across several components, including an
 * override interaction that would otherwise rot silently — see the last test.
 *
 * Deliberately unauthenticated and free of firestore/login helpers, so it runs
 * anywhere the app is served.
 */

/** A fresh signed-out context: none of this needs an account. Built from the
 *  project's own browser rather than a hardcoded one, since the WebKit nightly
 *  installs only WebKit and a `chromium.launch()` here had nothing to launch. */
async function anonymousPage(browser: Browser): Promise<{
    page: Page;
    close: () => Promise<void>;
}> {
    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5002',
        storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    // Close the context, not the browser — the browser is Playwright's fixture.
    return { page, close: () => context.close() };
}

/** The computed `user-select` of the first match, so a failure names the rule
 *  that broke. WebKit doesn't expose the unprefixed property on the computed
 *  style, so fall back to `-webkit-user-select` before reporting nothing. */
function selectability(page: Page, selector: string) {
    return page.evaluate((s) => {
        const element = document.querySelector(s);
        if (element === null) return `no element matched ${s}`;
        const style = getComputedStyle(element);
        return (
            style.userSelect || style.getPropertyValue('-webkit-user-select')
        );
    }, selector);
}

/** Sign out, make a project, and wait for it to be editable. */
async function openProject(page: Page) {
    await page.goto('/en-US/projects');
    await page.getByTestId('addproject').click();
    await page.waitForURL(/\/project\/[^/]+$/);
    // The name field is disabled until the project hydrates.
    await page.locator('#project-name:not([disabled])').waitFor();
}

test('the project view makes its chrome unselectable and its content selectable', async ({
    browser,
}) => {
    test.setTimeout(60000);
    const { page, close } = await anonymousPage(browser);
    try {
        await openProject(page);

        // The reported case: tile names, footer links, and toolbar labels.
        expect(await selectability(page, '.tile .header h2')).toBe('none');
        expect(await selectability(page, 'footer a')).toBe('none');

        // A project name is real content, and it lives in a field — which also
        // proves fields survive the global `none` (WebKit stops honoring a
        // field's own selection, and its editing, without this).
        expect(await selectability(page, '#project-name')).toBe('text');
    } finally {
        await close();
    }
});

test('documentation prose is selectable while the chrome around it is not', async ({
    browser,
}) => {
    test.setTimeout(60000);
    const { page, close } = await anonymousPage(browser);
    try {
        await page.goto('/en-US/guide');
        await page.locator('.markup').first().waitFor();

        expect(await selectability(page, '.markup')).toBe('text');
        expect(await selectability(page, 'h1')).toBe('text');
        expect(await selectability(page, 'footer a')).toBe('none');

        // The end-to-end proof, not just a computed style: a real select-all
        // must reach the prose and miss the chrome. Page.svelte's keydown
        // handler only claims scroll keys, so `A` reaches the document.
        await page.locator('.markup').first().click();
        await page.keyboard.press('ControlOrMeta+a');
        const selected = await page.evaluate(
            () => window.getSelection()?.toString() ?? '',
        );

        const prose = await page.locator('.markup').first().innerText();
        // A distinctive run of the prose, short enough to survive whitespace
        // normalization differences between innerText and a selection.
        const excerpt = prose.replace(/\s+/g, ' ').trim().slice(0, 20);
        expect(excerpt.length).toBeGreaterThan(0);
        expect(selected.replace(/\s+/g, ' ')).toContain(excerpt);

        // And the footer's links, which have nothing to do with the prose.
        const footerLabel = await page
            .locator('footer a')
            .last()
            .evaluate((a) => a.textContent?.trim() ?? '');
        if (footerLabel.length > 2) expect(selected).not.toContain(footerLabel);
    } finally {
        await close();
    }
});

/**
 * An override interaction: a descendant re-asserting `none` against an opt-in
 * it would otherwise inherit, since a descendant's own rule always beats an
 * ancestor's. The other one — HowToPreview's markup title inside its drag tile
 * — needs a gallery, so it lives in howto-form.spec.ts.
 */
test('the editor keeps its own selection model even though ValueView opts in', async ({
    browser,
}) => {
    test.setTimeout(60000);
    const { page, close } = await anonymousPage(browser);
    try {
        await openProject(page);

        expect(await selectability(page, '.editor')).toBe('none');

        // NodeView renders debug bubbles through ValueView, and reaching a real
        // one needs a stepped evaluation — so plant the same shape instead. It
        // has to carry ValueView's scoping class or it inherits `none` from the
        // editor and the test passes without the rule under test existing at
        // all. Find that class by the rule itself rather than hard-coding a
        // hash that changes whenever ValueView's CSS does.
        const planted = await page.evaluate(() => {
            const scoped = [...document.styleSheets]
                .flatMap((sheet) => {
                    try {
                        return [...sheet.cssRules];
                    } catch {
                        return []; // cross-origin sheet
                    }
                })
                .find(
                    (rule): rule is CSSStyleRule =>
                        rule instanceof CSSStyleRule &&
                        /^\.value\.svelte-[a-z0-9]+$/.test(rule.selectorText) &&
                        // WebKit drops the unprefixed declaration it can't
                        // parse, so the prefixed one is all that survives there.
                        (rule.style.getPropertyValue('user-select') ||
                            rule.style.getPropertyValue(
                                '-webkit-user-select',
                            )) === 'text',
                );
            if (scoped === undefined) return false;

            const bubble = document.createElement('div');
            bubble.className = scoped.selectorText.slice(1).replace('.', ' ');
            bubble.id = 'planted-value';
            document.querySelector('.editor')?.appendChild(bubble);
            return true;
        });

        // If ValueView's opt-in ever disappears there is nothing to override,
        // and a silent skip would hide that.
        expect(planted, "ValueView's scoped opt-in rule was not found").toBe(
            true,
        );
        expect(await selectability(page, '#planted-value')).toBe('none');
    } finally {
        await close();
    }
});
