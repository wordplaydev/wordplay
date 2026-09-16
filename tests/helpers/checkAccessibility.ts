import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import type { Result } from 'axe-core';

/**
 * The project's accessibility standard: axe-detectable WCAG 2.2 Level AA.
 * These tags select every axe rule mapped to a WCAG 2.0/2.1/2.2 A or AA
 * success criterion. See CLAUDE.md's Accessibility section.
 */
export const WCAG_AA_TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
];

/** Render violations so a CI failure identifies the rule, element, and fix. */
function formatViolations(violations: Result[]): string {
    return violations
        .map((violation) =>
            [
                `${violation.id} (${violation.impact}): ${violation.help}`,
                `  ${violation.helpUrl}`,
                ...violation.nodes.map(
                    (node) =>
                        `  ${node.target.join(' ')}\n    ${node.html}\n    ${
                            node.failureSummary ?? ''
                        }`,
                ),
            ].join('\n'),
        )
        .join('\n\n');
}

/**
 * Fail the test on ANY axe violation at WCAG 2.2 AA on the current page.
 *
 * `exclude` and `disableRules` are escape hatches for genuinely
 * creator-authored or third-party content ONLY — every use MUST carry an
 * inline comment at the call site explaining why the region or rule is out
 * of scope. Wordplay-authored content (seeded projects, guide examples,
 * tutorial) is always in scope.
 *
 * `include` narrows a scan to one region. Unlike `exclude` it suppresses
 * nothing: the whole-page scans above still cover everything, and this is for a
 * test that opens a particular surface to check that surface — so a failure
 * names the thing the test is about rather than whatever else that route
 * happens to render. Prefer a whole-page scan; reach for this only when a
 * region can't be opened without also opening chrome that is somebody else's
 * fix, and say which at the call site.
 *
 * `verbose` logs axe's "incomplete" results (checks needing human review,
 * e.g. contrast over gradients). They never gate, but are worth an
 * occasional look.
 */
export async function expectNoAxeViolations(
    page: Page,
    options?: {
        include?: string[];
        exclude?: string[];
        disableRules?: string[];
        verbose?: boolean;
    },
): Promise<void> {
    let builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS);
    for (const selector of options?.include ?? [])
        builder = builder.include(selector);
    for (const selector of options?.exclude ?? [])
        builder = builder.exclude(selector);
    if (options?.disableRules !== undefined)
        builder = builder.disableRules(options.disableRules);
    const results = await builder.analyze();
    if (options?.verbose === true && results.incomplete.length > 0)
        console.log(
            `axe incomplete (needs review, not gating): ${results.incomplete
                .map((incomplete) => incomplete.id)
                .join(', ')}`,
        );
    expect(
        results.violations,
        `axe found ${results.violations.length} WCAG 2.2 AA violation(s):\n\n${formatViolations(
            results.violations,
        )}`,
    ).toEqual([]);
}

/**
 * Put the page in a color scheme, and prove it landed, so one navigation can be
 * scanned in both.
 *
 * The palette is pure CSS — `:root { color-scheme: light dark }` with every token
 * a `light-dark()` pair (src/app.html) — and the app only forces a keyword when
 * the `dark` setting is non-null, which defaults to null and which no e2e test
 * sets. So `emulateMedia` re-resolves every color with no reload, and a reload is
 * the 3-4s of navigation and hydration that made scanning each surface twice the
 * most expensive thing in the suite.
 *
 * Measured before relying on it: over all 13 public routes and over the project
 * editor with a running stage, a page flipped this way produced axe results
 * identical to a fresh navigation already in that scheme. The poll below is what
 * keeps that true — `body`'s background is `--wordplay-background` →
 * `--color-white` → `light-dark(#ffffff, #000000)`, the cheapest used value that
 * proves the flip reached paint rather than merely being requested.
 */
export async function useColorScheme(
    page: Page,
    scheme: 'light' | 'dark',
): Promise<void> {
    await page.emulateMedia({ colorScheme: scheme });
    await expect
        .poll(() =>
            page.evaluate(
                () => getComputedStyle(document.body).backgroundColor,
            ),
        )
        .toBe(scheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
}

/**
 * Scan the page as it stands, once per color scheme, on one navigation.
 *
 * Every axe rule whose result can differ by scheme is a color rule, and both
 * schemes are scanned against the fully rendered page, so this checks what two
 * navigations checked. Prefer it to two `test.use({ colorScheme })` describes.
 */
export async function expectNoAxeViolationsInBothSchemes(
    page: Page,
    options?: Parameters<typeof expectNoAxeViolations>[1],
): Promise<void> {
    for (const scheme of ['light', 'dark'] as const) {
        await useColorScheme(page, scheme);
        await expectNoAxeViolations(page, options);
    }
}

/**
 * The width WCAG 2.1's 1.4.10 Reflow names: content must reflow to 320 CSS px
 * without the reader having to scroll in two directions.
 */
export const REFLOW_VIEWPORT = { width: 320, height: 844 };

/**
 * Fail the test if the page scrolls sideways at `REFLOW_VIEWPORT`.
 *
 * This is 1.4.10 Reflow, a WCAG 2.1 AA criterion axe cannot detect — the
 * "Beyond axe" category in CLAUDE.md. Callers resize first and assert after the
 * axe scans, so it costs no navigation.
 *
 * It measures `main`, not the document: `html`, `body`, and `#wordplay-app` are
 * `overflow: hidden` (src/app.html), so the document never scrolls and anything
 * measuring `documentElement.scrollWidth` silently passes. `main` in Page.svelte
 * is `overflow: auto` and is the box that actually pans.
 *
 * A region that scrolls sideways on purpose — `/design`'s tables, a how-to's pan
 * canvas — contains its own overflow and so never widens `main`. No route needs
 * an exception today; if one ever does, it belongs here with a reason rather
 * than as a skipped route.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
    const overflow = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (main === null) return null;
        // A fractional layout width rounds up into scrollWidth, so a pixel of
        // slack keeps this from failing on rounding alone.
        if (main.scrollWidth <= main.clientWidth + 1) return null;

        // Name what is sticking out, so a failure identifies the element rather
        // than just the number. Anything inside a descendant that clips or
        // scrolls is that descendant's business, not the page's.
        const edge = main.getBoundingClientRect().left + main.clientWidth;
        const clipped = (element: Element) => {
            let parent = element.parentElement;
            while (parent !== null && parent !== main) {
                const { overflowX } = getComputedStyle(parent);
                if (['hidden', 'clip', 'auto', 'scroll'].includes(overflowX))
                    return true;
                parent = parent.parentElement;
            }
            return false;
        };
        const culprits = [];
        for (const element of main.querySelectorAll('*')) {
            const box = element.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            if (getComputedStyle(element).visibility === 'hidden') continue;
            if (box.right <= edge + 1 || clipped(element)) continue;
            culprits.push({
                past: Math.round(box.right - edge),
                // The deepest element crossing the edge is the one to fix, so
                // prefer a leaf when several report the same overshoot.
                children: element.children.length,
                description: `${element.tagName.toLowerCase()}${
                    element.className && typeof element.className === 'string'
                        ? `.${element.className.trim().split(/\s+/).join('.')}`
                        : ''
                }: "${(element.textContent ?? '').trim().slice(0, 60)}"`,
            });
        }
        culprits.sort((a, b) => b.past - a.past || a.children - b.children);
        return {
            client: main.clientWidth,
            scroll: main.scrollWidth,
            culprits: culprits
                .slice(0, 5)
                .map((c) => `+${c.past}px ${c.description}`),
        };
    });

    expect(
        overflow,
        overflow === null
            ? ''
            : `Page scrolls sideways at ${REFLOW_VIEWPORT.width}px (WCAG 1.4.10 Reflow): main is ${overflow.client}px but scrolls to ${overflow.scroll}px.\nWidest elements past the edge:\n  ${overflow.culprits.join('\n  ')}`,
    ).toBeNull();
}
