/// <reference types="node" />
import type { Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect, test } from '../../playwright/fixtures';
import { loginNewContext } from '../helpers/loginNewContext';
import { REFLOW_VIEWPORT } from '../helpers/checkAccessibility';
import { ReflowSlugs, Surfaces, type Surface } from './surfaces';

/**
 * Photograph every UI surface in both color schemes.
 *
 * Deliberately assertion-light: this is a review instrument, not a gate. The
 * one thing it does assert is that the surface actually rendered, because a
 * tile of an empty page is worse than a missing tile — it reads as a finding.
 */

/** Where the shots land. Outside the repo by default: they are review
 *  material, regenerated on demand, and 100-odd PNGs do not belong in a diff. */
const OutDir =
    process.env.CONTACT_SHEET_OUT ??
    path.resolve(
        '/private/tmp/claude-501/-Users-amyko-Code-wordplay',
        '4c866d04-749e-4fb4-9569-3826bc9a4e9a/scratchpad/contact-sheet',
    );

const ShotsDir = path.join(OutDir, 'shots');

/** One record per shot, collected across workers and merged at the end. */
type Tile = {
    slug: string;
    title: string;
    kind: Surface['kind'];
    auth: Surface['auth'];
    path: string;
    findings: string[];
    note?: string;
    shots: Partial<Record<'light' | 'dark' | 'reflow', string>>;
    /** Set when the surface did not render, so the sheet says so rather than
     *  showing a blank tile that reads as a design problem. */
    failure?: string;
};

/** Each worker writes its own file; nothing coordinates, so nothing races. */
function recordTile(tile: Tile): void {
    fs.mkdirSync(path.join(OutDir, 'tiles'), { recursive: true });
    fs.writeFileSync(
        path.join(OutDir, 'tiles', `${tile.slug}.json`),
        JSON.stringify(tile, null, 2),
    );
}

/**
 * Wait for the surface's own content, not for the shell.
 *
 * Every page renders a header before its content arrives, so a shot taken on
 * `load` can be of a page with none of itself on it. A dialog additionally has
 * to be open: `clearUnclaimedDialog()` strips a `?dialog=` no mounted dialog
 * claims, which would otherwise yield a silent tile of the bare page beneath.
 */
async function waitForSurface(page: Page, surface: Surface): Promise<void> {
    if (surface.open) {
        const clip = surface.clip ? page.locator(surface.clip).first() : null;
        // Idempotent: the tile may already be open from a previous capture on
        // this same page, and pressing the toggle again would close it.
        if (clip === null || !(await clip.isVisible()))
            await page.getByTestId(surface.open).click();
    }
    if (surface.kind === 'dialog')
        await expect(page.locator('dialog[open]').first()).toBeVisible();
    if (surface.ready)
        await expect(page.locator(surface.ready).first()).toBeVisible();
    if (surface.kind === 'tile' && surface.clip)
        await expect(page.locator(surface.clip).first()).toBeVisible();
    // Let the last layout settle. Fonts are preloaded and animations are off,
    // so this is short by design — it is not standing in for an assertion.
    await page.waitForTimeout(250);
}

/**
 * Navigate with the locale in the URL, and wait for hydration.
 *
 * The `/en-US` prefix is load-bearing for a signed-out capture: the first-run
 * language prompt opens for any visitor who has never chosen one, and
 * `shouldPromptForLocale` bails the moment the URL names a locale. Without it,
 * every public tile is a photograph of the same modal. Matches how
 * tests/end2end/accessibility.spec.ts reaches the same routes.
 */
async function open(page: Page, surface: Surface): Promise<void> {
    const path = surface.path.startsWith('/en-US')
        ? surface.path
        : `/en-US${surface.path}`;
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Every page renders a heading once the client has taken over.
    await expect(page.getByRole('heading').first()).toBeVisible({
        timeout: 15000,
    });
}

/** Flip the scheme and prove it landed, the way the a11y helper does. */
async function useScheme(page: Page, scheme: 'light' | 'dark'): Promise<void> {
    await page.emulateMedia({ colorScheme: scheme });
    await expect
        .poll(() =>
            page.evaluate(
                () => getComputedStyle(document.body).backgroundColor,
            ),
        )
        .toBe(scheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
}

async function shoot(
    page: Page,
    surface: Surface,
    variant: 'light' | 'dark' | 'reflow',
): Promise<string> {
    fs.mkdirSync(ShotsDir, { recursive: true });
    const file = `${surface.slug}--${variant}.png`;
    const target = surface.clip ? page.locator(surface.clip).first() : page;
    // Never fullPage: the app scrolls in its own region (app.html sets
    // overflow: hidden on html/body/#wordplay-app), so fullPage silently
    // returns one viewport anyway. The tall viewport is what shows more.
    await target.screenshot({ path: path.join(ShotsDir, file) });
    return file;
}

/** Photograph one surface on an already-navigated page, both schemes. */
async function captureBoth(page: Page, surface: Surface): Promise<Tile> {
    const tile: Tile = {
        slug: surface.slug,
        title: surface.title,
        kind: surface.kind,
        auth: surface.auth,
        path: surface.path,
        findings: surface.findings ?? [],
        ...(surface.note === undefined ? {} : { note: surface.note }),
        shots: {},
    };

    try {
        await waitForSurface(page, surface);
        // One navigation, two shots: a flipped page is equivalent to a fresh
        // load in that scheme, and this roughly halves the run.
        for (const scheme of ['light', 'dark'] as const) {
            await useScheme(page, scheme);
            tile.shots[scheme] = await shoot(page, surface, scheme);
        }
        if (ReflowSlugs.has(surface.slug)) {
            await useScheme(page, 'light');
            await page.setViewportSize(REFLOW_VIEWPORT);
            await page.waitForTimeout(250);
            tile.shots.reflow = await shoot(page, surface, 'reflow');
        }
    } catch (error) {
        tile.failure = error instanceof Error ? error.message : String(error);
    }

    return tile;
}

/**
 * The signed-out surfaces.
 *
 * `storageState` is cleared explicitly: the fixture this file imports signs in
 * once per worker and hands that state to every test, so without this the
 * "public" tiles would all carry a signed-in footer — and /login and /join
 * would photograph as something a visitor never sees.
 */
test.describe('public surfaces', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const surface of Surfaces.filter((s) => s.auth === 'none')) {
        test(`capture ${surface.slug}`, async ({ page }) => {
            await open(page, surface);
            recordTile(await captureBoth(page, surface));
        });
    }
});

/** Signed in as the worker's own creator, via the worker-scoped fixture. */
test.describe('creator surfaces', () => {
    for (const surface of Surfaces.filter((s) => s.auth === 'creator')) {
        test(`capture ${surface.slug}`, async ({ page }) => {
            await open(page, surface);
            recordTile(await captureBoth(page, surface));
        });
    }
});

/**
 * Surfaces behind a claim. `loginNewContext` rather than the worker fixture,
 * because these need a specific identity rather than any signed-in creator.
 */
/** The seeded account that satisfies each level. */
const Account: Record<string, string> = {
    owner: 'creator',
    admin: 'admin',
    teacher: 'teacher',
};

async function withIdentity(
    browser: Browser,
    username: string,
    surface: Surface,
): Promise<void> {
    const { context, page } = await loginNewContext(
        browser,
        username,
        'password',
    );
    try {
        await page.setViewportSize({ width: 1280, height: 1800 });
        await open(page, surface);
        recordTile(await captureBoth(page, surface));
    } finally {
        await context.close();
    }
}

test.describe('privileged surfaces', () => {
    for (const surface of Surfaces.filter(
        (s) => s.auth in Account && s.kind !== 'tile',
    )) {
        test(`capture ${surface.slug}`, async ({ browser }) => {
            await withIdentity(browser, Account[surface.auth] ?? '', surface);
        });
    }

    /**
     * The project route is four chromes on one page, so it is one navigation
     * and four clips rather than four page loads — the editor alone takes
     * seconds to parse, compile and render a project.
     */
    const tiles = Surfaces.filter((s) => s.kind === 'tile');
    const first = tiles[0];
    if (first !== undefined)
        test('capture project tiles', async ({ browser }) => {
            const { context, page } = await loginNewContext(
                browser,
                Account[first.auth] ?? '',
                'password',
            );
            try {
                await page.setViewportSize({ width: 1280, height: 1800 });
                await open(page, first);
                // The editor is the slowest thing on the page; once it is up,
                // the rest of the layout has settled.
                await expect(page.locator('.editor').first()).toBeVisible();
                for (const surface of tiles)
                    recordTile(await captureBoth(page, surface));
            } finally {
                await context.close();
            }
        });
});
