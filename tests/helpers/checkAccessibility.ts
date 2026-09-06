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
