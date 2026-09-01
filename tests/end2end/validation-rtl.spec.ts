import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { waitForDocumentUpdate } from '../helpers/firestore';

/**
 * A field's validation message in Hebrew, which the routes serve right to left.
 *
 * Its inline start is the field's *right* edge, and the one field that puts its
 * message beside itself puts it on the other side. Both were wrong until this
 * existed: `.message.inline` sets `inset-inline-start: 100%`, which in
 * RTL is `right: 100%`, and with that and a JS-set `left` both applied the box
 * collapsed to eighteen pixels and slid off the screen — while every assertion
 * about which side it was on still passed.
 *
 * Each test brings its own project rather than borrowing the seeded one: the
 * second adds a source to it, and the seed is shared with half the suite.
 */

const LOAD = 30_000;

/** Open a project of our own under the Hebrew route. */
async function hebrewProject(page: import('@playwright/test').Page) {
    const id = await createTestProject(page);
    // Changing locale is a fresh page load, so the project has to have reached
    // the cloud first or it loads as missing.
    await waitForDocumentUpdate(page, 'projects', id, (d) => d !== null);
    await page.goto(`/he-IL/project/${id}`);
    await expect(page.locator('#project-name')).toBeVisible({ timeout: LOAD });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    return id;
}

async function measure(page: import('@playwright/test').Page, id: string) {
    return page.evaluate((fieldId: string) => {
        const f = document.getElementById(fieldId) as HTMLElement;
        const m = document.getElementById(`${fieldId}-error`) as HTMLElement;
        const fr = f.getBoundingClientRect();
        const mr = m.getBoundingClientRect();
        // Anything painting over the message shows up at one of these points.
        // The message is `pointer-events: none` in normal use — it outlives the
        // focus that raised it, so it must never swallow a press meant for what
        // is under it — which also takes it out of hit testing. Opt back in for
        // the probe, since paint order is what is being measured, not hit
        // order.
        const pointerEvents = m.style.pointerEvents;
        m.style.pointerEvents = 'auto';
        const over = new Set<string>();
        for (const dx of [8, mr.width / 2, mr.width - 8])
            for (const dy of [6, mr.height / 2, mr.height - 6]) {
                const el = document.elementFromPoint(
                    Math.round(mr.left + dx),
                    Math.round(mr.top + dy),
                ) as HTMLElement | null;
                if (el && el !== m && !m.contains(el)) over.add(el.tagName);
            }
        m.style.pointerEvents = pointerEvents;
        return {
            direction: getComputedStyle(f).direction,
            fieldLeft: Math.round(fr.left),
            fieldRight: Math.round(fr.right),
            fieldBottom: Math.round(fr.bottom),
            msgLeft: Math.round(mr.left),
            msgRight: Math.round(mr.right),
            msgTop: Math.round(mr.top),
            viewport: window.innerWidth,
            paintedOver: [...over],
        };
    }, id);
}

test('Hebrew: the message starts at the field’s right edge', async ({
    page,
}) => {
    await hebrewProject(page);
    await page.getByTestId('collaborate-toggle').click();
    const field = page.locator('#collaborator-to-add');
    await expect(field).toBeVisible({ timeout: LOAD });
    await field.fill('ab');
    await expect(page.locator('#collaborator-to-add-error')).toBeVisible();

    const r = await measure(page, 'collaborator-to-add');
    expect(r.direction).toBe('rtl');
    // The inline start of a right-to-left field is its right edge.
    expect(Math.abs(r.msgRight - r.fieldRight)).toBeLessThanOrEqual(1);
    expect(r.msgTop).toBeGreaterThanOrEqual(r.fieldBottom);
    expect(r.msgLeft).toBeGreaterThanOrEqual(0);
    expect(r.paintedOver).toEqual([]);
});

test('Hebrew: a message placed beside its field goes on the other side', async ({
    page,
}) => {
    await hebrewProject(page);
    // The source rename field — the app's only inlineValidation user — appears
    // only once a project has more than one source.
    await page.locator('[data-uiid="addSource"]').first().click();
    const name = page.locator('input[id^="source-name-editor"]').first();
    await expect(name).toBeVisible({ timeout: LOAD });
    const id = await name.getAttribute('id');
    await name.click();
    await name.fill('not a name!');
    await expect(page.locator(`#${id}-error`)).toBeVisible();

    const r = await measure(page, id!);
    expect(r.direction).toBe('rtl');
    // Wholly on screen, which an earlier version was not.
    expect(r.msgLeft).toBeGreaterThanOrEqual(0);
    expect(r.msgRight).toBeLessThanOrEqual(r.viewport);
    // Beside it means the field's left in a right-to-left layout; below is the
    // fallback when there isn't room.
    if (r.msgTop < r.fieldBottom)
        expect(r.msgRight).toBeLessThanOrEqual(r.fieldLeft);
    expect(r.paintedOver).toEqual([]);
});
