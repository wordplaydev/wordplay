import { expect, test } from '../../playwright/fixtures';
import { createTestCharacter } from '../helpers/createCharacter';
import { createTestProject } from '../helpers/createProject';

/**
 * Regression coverage for #724. Zod's `optional()` inferred `T | undefined`,
 * so TypeScript permitted an undefined in a slot Firestore rejects, and the
 * editor's `getCurrentFill() && …` guard could not tell "inherit" (null, a
 * real value) from "none" (undefined, an absent key). The schemas now use
 * `exactOptional()`; these tests read the stored document to prove the
 * distinction survives all the way to Firestore.
 *
 * They read the emulator's REST API rather than tests/helpers/firestore.ts
 * because firebase-admin doesn't link under ESM locally, and because the
 * typed-value JSON shows whether a key is absent or holds null.
 */

type FirestoreValue = {
    nullValue?: null;
    mapValue?: { fields?: Record<string, FirestoreValue> };
    arrayValue?: { values?: FirestoreValue[] };
    stringValue?: string;
};

type FirestoreDocument = { fields?: Record<string, FirestoreValue> };

async function readDocument(
    collection: string,
    id: string,
): Promise<FirestoreDocument | undefined> {
    const response = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-wordplay/databases/(default)/documents/${collection}/${id}`,
        { headers: { Authorization: 'Bearer owner' } },
    );
    if (!response.ok) return undefined;
    const document: FirestoreDocument = await response.json();
    return document;
}

/** Poll until `done`, since the editor's save is debounced. */
async function until<T>(
    read: () => Promise<T>,
    done: (value: T) => boolean,
    what: string,
): Promise<T> {
    let last: T | undefined;
    for (let attempt = 0; attempt < 60; attempt++) {
        last = await read();
        if (done(last)) return last;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`${what} never settled; last was ${JSON.stringify(last)}`);
}

/** The stored fields of a character's first shape, or undefined if it has none. */
async function firstShapeFields(
    id: string,
): Promise<Record<string, FirestoreValue> | undefined> {
    const document = await readDocument('characters', id);
    return document?.fields?.['shapes']?.arrayValue?.values?.[0]?.mapValue
        ?.fields;
}

/** Draw one rectangle by dragging across the middle of the canvas. */
async function drawRectangle(page: import('@playwright/test').Page) {
    const box = await page.locator('.canvas').boundingBox();
    if (box === null) throw new Error('the canvas has no box to draw in');
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, {
        steps: 8,
    });
    await page.mouse.up();
}

async function chooseRectangleTool(page: import('@playwright/test').Page) {
    await page
        .getByRole('radiogroup', { name: 'mode' })
        .getByRole('radio', { name: 'rectangle', exact: true })
        .click();
}

async function chooseColor(
    page: import('@playwright/test').Page,
    group: 'fill' | 'stroke',
    setting: 'none' | 'inherit',
) {
    await page
        .getByRole('radiogroup', { name: group })
        .getByRole('radio', { name: setting, exact: true })
        .click();
}

test('an inherited fill is stored as null, not dropped', async ({ page }) => {
    const id = await createTestCharacter(page);

    await chooseRectangleTool(page);
    await chooseColor(page, 'fill', 'inherit');
    await chooseColor(page, 'stroke', 'none');
    await drawRectangle(page);

    const fields = await until(
        () => firstShapeFields(id),
        (shape) => shape !== undefined,
        'the drawn rectangle',
    );
    if (fields === undefined) throw new Error('unreachable');

    // Null means "inherit currentColor" — a value, not an absence. The old
    // truthiness guard dropped it, so an inherited fill read back as "none".
    expect(fields['fill']).toEqual({ nullValue: null });

    // An unset optional is an absent key, never an undefined value.
    expect(Object.keys(fields)).not.toContain('angle');
    expect(Object.keys(fields)).not.toContain('stroke');

    // The app parses its own document back: reload and the shape is still there.
    await page.reload();
    await expect(page.locator('.canvas rect').first()).toBeVisible();
});

test('no fill omits the key entirely', async ({ page }) => {
    const id = await createTestCharacter(page);

    await chooseRectangleTool(page);
    await chooseColor(page, 'stroke', 'inherit');
    await chooseColor(page, 'fill', 'none');
    await drawRectangle(page);

    const fields = await until(
        () => firstShapeFields(id),
        (shape) => shape !== undefined,
        'the drawn rectangle',
    );
    if (fields === undefined) throw new Error('unreachable');

    expect(Object.keys(fields)).not.toContain('fill');
    expect(fields['stroke']?.mapValue?.fields?.['color']).toEqual({
        nullValue: null,
    });
});

test('unpinning a project preview clears it without a rejected write', async ({
    page,
}) => {
    // Project.withPreview(undefined) removes the key rather than putting a
    // literal undefined into the project data, which Firestore would reject.
    const projectId = await createTestProject(page);
    if (!page.url().includes(`/project/${projectId}`))
        await page.goto(`/en-US/project/${projectId}`);

    await page
        .locator('[data-uiid="shareDialog"]')
        .getByRole('button', { name: 'show project sharing options' })
        .click();
    await page.getByRole('tab', { name: 'Preview' }).click();

    const previewMode = async () => {
        const document = await readDocument('projects', projectId);
        return document?.fields?.['preview']?.mapValue?.fields?.['mode']
            ?.stringValue;
    };

    await page.getByRole('button', { name: 'pin a glyph you choose' }).click();
    await until(previewMode, (mode) => mode === 'manual', 'the pinned preview');

    // Back to automatic. The clearing write must land, and the document must
    // stop claiming a manual pin.
    await page
        .getByRole('button', {
            name: 'let the project pick its own preview glyph based on what it shows',
        })
        .click();
    await until(
        previewMode,
        (mode) => mode === undefined || mode === 'auto',
        'the cleared preview',
    );
});
