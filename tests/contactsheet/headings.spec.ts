/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { expect, test } from '../../playwright/fixtures';
import { loginNewContext } from '../helpers/loginNewContext';
import { Surfaces } from './surfaces';

/**
 * The document outline of every surface that renders a heading, captured as
 * data so a change to it can be diffed rather than reasoned about.
 *
 * Exists because axe does not check heading order — `heading-order`,
 * `page-has-heading-one` and `empty-heading` are all tagged `best-practice`,
 * and `WCAG_AA_TAGS` selects only the five `wcag*` tags — and because
 * `aria-snapshots.spec.ts` uses subset matching over two regions, so neither
 * would notice a heading level changing on any of the surfaces that carry one.
 *
 * Run before and after a change that touches headings; diff the two files.
 */

const OutFile =
    process.env.HEADING_OUTLINE_OUT ??
    path.resolve(
        '/private/tmp/claude-501/-Users-amyko-Code-wordplay',
        '4c866d04-749e-4fb4-9569-3826bc9a4e9a/scratchpad/headings.json',
    );

/** Surfaces worth reading an outline from: routes and dialogs, not element clips. */
const Covered = Surfaces.filter((s) => s.kind !== 'tile' && s.kind !== 'stub');

const outline: Record<string, string[]> = {};

test.afterAll(() => {
    const merged = fs.existsSync(OutFile)
        ? JSON.parse(fs.readFileSync(OutFile, 'utf8'))
        : {};
    fs.writeFileSync(
        OutFile,
        JSON.stringify({ ...merged, ...outline }, null, 2),
    );
});

async function capture(page: import('@playwright/test').Page, slug: string) {
    outline[slug] = await page.evaluate(() =>
        [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(
            (h) =>
                `${h.tagName.toLowerCase()}  ${(h.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)}`,
        ),
    );
}

async function open(
    page: import('@playwright/test').Page,
    s: (typeof Surfaces)[number],
) {
    const p = s.path.startsWith('/en-US') ? s.path : `/en-US${s.path}`;
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading').first()).toBeVisible({
        timeout: 15000,
    });
    if (s.ready) await expect(page.locator(s.ready).first()).toBeVisible();
    await page.waitForTimeout(400);
}

test.describe('public outlines', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    for (const s of Covered.filter((s) => s.auth === 'none'))
        test(`outline ${s.slug}`, async ({ page }) => {
            await open(page, s);
            await capture(page, s.slug);
        });
});

test.describe('creator outlines', () => {
    for (const s of Covered.filter((s) => s.auth === 'creator'))
        test(`outline ${s.slug}`, async ({ page }) => {
            await open(page, s);
            await capture(page, s.slug);
        });
});

const Account: Record<string, string> = {
    owner: 'creator',
    admin: 'admin',
    teacher: 'teacher',
};

test.describe('privileged outlines', () => {
    for (const s of Covered.filter((s) => s.auth in Account))
        test(`outline ${s.slug}`, async ({ browser }) => {
            const { context, page } = await loginNewContext(
                browser,
                Account[s.auth] ?? '',
                'password',
            );
            try {
                await open(page, s);
                await capture(page, s.slug);
            } finally {
                await context.close();
            }
        });
});
