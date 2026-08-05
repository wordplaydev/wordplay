import { expect, test } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';

/**
 * The centralized Announcer (src/components/project/Announcer.svelte) owns
 * the app's live regions: a paced, polite one for status and an assertive one
 * for the direct answers to a keystroke (typing echo, caret, rejections).
 * These verify announcements actually reach them — something neither axe nor
 * the compiler can check.
 */

test('the Announcer owns exactly one region of each kind', async ({ page }) => {
    await createTestProject(page);
    await expect(page.locator('.announcements.paced')).toHaveCount(1);
    await expect(page.locator('.announcements.immediate')).toHaveCount(1);
});

test('a playing project announces its output; an edited one stays quiet', async ({
    page,
}) => {
    await createTestProject(page);
    const region = page.locator('.announcements.paced');
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('1');

    // While editing, the stage must not describe itself: it would talk over
    // the caret and echo announcements the creator is navigating by.
    await page.waitForTimeout(1500);
    expect((await region.textContent()) ?? '').not.toContain('Output');

    // Playing, it announces what the program produced.
    await page.keyboard.press('ControlOrMeta+Alt+Digit7');
    await expect(region).toContainText('Output', { timeout: 15000 });
});

test('tutorial navigation announces the new dialog turns', async ({ page }) => {
    await page.goto('/en-US/learn');
    await page.getByRole('button', { name: 'Quick' }).click();
    await expect(page.getByRole('article').first()).toBeVisible({
        timeout: 30000,
    });
    const region = page.locator('.announcements.paced');
    const before = await region.textContent();
    // Advancing to the next pause routes the new dialog's text through the
    // centralized Announcer (TutorialView has no local live region anymore).
    await page.getByRole('button', { name: 'next pause in dialog' }).click();
    await expect
        .poll(async () => {
            const text = await region.textContent();
            return text !== null && text.trim() !== '' && text !== before;
        })
        .toBe(true);
});

test('typing in the editor announces through the live region', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.type('1');
    // The editor announces caret/edit state changes; the exact wording is
    // locale-owned, so assert delivery, not content. (Character echo itself is
    // native — see the "editor echo mirrors" tests — so what arrives here is
    // the caret description.)
    await expect(page.locator('.announcements.immediate')).not.toHaveText('', {
        timeout: 15000,
    });
});

/**
 * Character echo is native (#1248): the hidden textarea mirrors the source and
 * caret, and echo-bearing keystrokes edit it for real, so the platform echoes
 * them the way it does any text field — chime-free. The speech half is
 * verified manually with VoiceOver; these verify the machine-checkable half,
 * the mirror the platform echoes from.
 */
test.describe('editor echo mirrors the source into the textarea', () => {
    /** The mirror state of the focused editor's hidden field. */
    function mirror(page: import('@playwright/test').Page) {
        return page
            .locator('.keyboard-input')
            .first()
            .evaluate((el) => {
                const field = el as HTMLTextAreaElement;
                return {
                    value: field.value,
                    start: field.selectionStart,
                    end: field.selectionEnd,
                };
            });
    }

    async function emptyEditor(page: import('@playwright/test').Page) {
        await createTestProject(page);
        const editor = page.getByTestId('editor').first();
        await editor.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
    }

    test('typing lands in the field with the caret after it', async ({
        page,
    }) => {
        await emptyEditor(page);
        await page.keyboard.type('abc');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: 'abc', start: 3, end: 3 });
    });

    test('backspace shrinks the field and moves the selection', async ({
        page,
    }) => {
        await emptyEditor(page);
        await page.keyboard.type('abc');
        await page.keyboard.press('Backspace');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: 'ab', start: 2, end: 2 });
    });

    test('arrow keys move the selection without changing the value', async ({
        page,
    }) => {
        await emptyEditor(page);
        await page.keyboard.type('abc');
        // The first Left selects the just-typed token as a node; the mirror
        // maps a node selection to its text span, so a screen reader hears
        // the selection a sighted user sees.
        await page.keyboard.press('ArrowLeft');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: 'abc', start: 0, end: 3 });
        // The second collapses to a position inside the token.
        await page.keyboard.press('ArrowLeft');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: 'abc', start: 2, end: 2 });
    });

    test('an auto-closed delimiter converges the field to the source', async ({
        page,
    }) => {
        await emptyEditor(page);
        // The editor inserts the closing paren the browser didn't type; the
        // mirror must reconcile to the model, caret between the parens.
        await page.keyboard.type('(');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: '()', start: 1, end: 1 });
    });

    test('Enter inserts a line natively', async ({ page }) => {
        await emptyEditor(page);
        await page.keyboard.type('1');
        await page.keyboard.press('Enter');
        await page.keyboard.type('2');
        await expect.poll(async () => (await mirror(page)).value).toBe('1\n2');
    });

    test('Shift+Enter still inserts a line through the input path', async ({
        page,
    }) => {
        // Matches no command, so it flows through the input event — whose
        // line-break data is null by spec and named explicitly (parity with
        // the pre-mirror behavior).
        await emptyEditor(page);
        await page.keyboard.type('1');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('2');
        await expect.poll(async () => (await mirror(page)).value).toBe('1\n2');
    });
});

test('clicking into the code announces where the caret landed', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    // Type something to click into, then clear the region's current text by
    // waiting for it to settle.
    await page.keyboard.type('1 + 2');
    const region = page.locator('.announcements.paced');
    await expect(region).not.toHaveText('', { timeout: 15000 });
    const before = await region.textContent();

    // Click a token: pointer placement is a discrete action, announced even
    // though the keyboard caret announcement is coalesced and focus-gated.
    await editor.locator('.token-view').first().click();
    await expect
        .poll(
            async () => {
                const text = await region.textContent();
                return text !== null && text.trim() !== '' && text !== before;
            },
            { timeout: 15000 },
        )
        .toBe(true);
});

/**
 * Strip layout whitespace and the zero-width separators the editor renders
 * between tokens, so a containment check compares code rather than typography.
 */
function stripped(text: string): string {
    return text.replace(/[\s\u200b-\u200d\ufeff]/g, '');
}

/**
 * Put a program into play mode and hand back a reader for the paced region.
 *
 * The program is driven by `Key()` rather than a temporal stream: headless
 * Chromium's animation factor leaves temporal streams frozen, so `Time()`
 * never advances and the test would prove nothing. Keystrokes are also
 * deterministic — each press is exactly one output change.
 */
async function playing(
    page: import('@playwright/test').Page,
    code: string,
): Promise<() => Promise<string>> {
    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    const base = page.url().split('?')[0];
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    // Paste rather than type: the editor's delimiter auto-close mangles typed
    // brackets and quotes.
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    // The paste is the whole setup, and it fails silently: `Meta+V` never
    // produced a native paste on Linux (there the editing command is Ctrl+V),
    // which left the program empty, throwing, so every assertion below read
    // the step-mode exception instead. Fail here, where the cause is legible.
    await expect
        .poll(async () => stripped((await editor.textContent()) ?? ''), {
            message: 'source did not load into the editor',
        })
        .toContain(stripped(code.split('\n')[0]));
    // The reload below re-reads the project from the database, so give the
    // debounced save time to land before navigating.
    await page.waitForTimeout(2000);
    await page.goto(`${base}?mode=play`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // The stage only receives keys when the output has focus.
    await page.locator('.value[tabindex="0"]').first().focus();
    return async () =>
        (
            (await page.locator('.announcements.paced').textContent()) ?? ''
        ).trim();
}

test('a program whose output changes announces a distinct text each time', async ({
    page,
}) => {
    // A screen reader ignores a live region whose text is unchanged, so
    // repeating a description is not an option. Each announcement has to
    // differ from the last to be heard at all.
    const read = await playing(page, 'Key()');
    const readings: string[] = [];
    for (const key of ['a', 'b', 'c']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(1200);
        readings.push(await read());
    }
    expect(readings).toEqual(['Output a', 'Output b', 'Output c']);
});

test('a value summarized the same way announces what changed inside it', async ({
    page,
}) => {
    // The Face() case: a structure whose summary is its type name would be
    // heard exactly once. Instead the property that changed is announced.
    const read = await playing(page, '•P(k•"")\nP(Key())');
    expect(await read()).toBe('Output P');
    await page.keyboard.press('a');
    await page.waitForTimeout(1200);
    expect(await read()).toBe('k a');
    await page.keyboard.press('b');
    await page.waitForTimeout(1200);
    expect(await read()).toBe('k b');
});

test('a program whose output never changes falls silent after describing itself', async ({
    page,
}) => {
    // Silence means "nothing changed" — the deliberate trade for dropping the
    // machinery that tried and failed to force a re-read.
    const read = await playing(page, '1 + 1');
    const first = await read();
    expect(first).toContain('2');
    await page.waitForTimeout(4000);
    expect(await read()).toBe(first);
});

/**
 * Record which announcement kinds reach the paced region while `act` runs.
 * The region carries `data-kind`, so this asserts on the kind rather than on
 * localized wording.
 */
async function kindsDuring(
    page: import('@playwright/test').Page,
    act: () => Promise<void>,
): Promise<string[]> {
    await page.evaluate(() => {
        const el = document.querySelector('.announcements.paced');
        const seen: string[] = [];
        (window as unknown as { seenKinds: string[] }).seenKinds = seen;
        if (el === null) return;
        new MutationObserver(() => {
            const kind = el.getAttribute('data-kind');
            if (
                kind !== null &&
                (el.textContent ?? '').trim() !== '' &&
                kind !== seen[seen.length - 1]
            )
                seen.push(kind);
        }).observe(el, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
        });
    });
    await act();
    return page.evaluate(
        () => (window as unknown as { seenKinds: string[] }).seenKinds,
    );
}

test('stage output is described once, by the stage', async ({ page }) => {
    // Both describers used to speak on every stage change — OutputView's
    // `value` summary and StageView's `stage-*` delta said the same thing with
    // different prefixes, one after the other.
    const read = await playing(page, 'Phrase(Key())');
    const kinds = await kindsDuring(page, async () => {
        for (const key of ['a', 'b']) {
            await page.keyboard.press(key);
            await page.waitForTimeout(1500);
        }
    });
    expect(
        kinds.filter((kind) => kind.startsWith('stage-')).length,
        'the stage should describe itself',
    ).toBeGreaterThan(0);
    // `value` is OutputView's summary — the second voice saying the same thing.
    expect(kinds).not.toContain('value');
    expect(await read()).not.toContain('Output');
});

test('a paused stage stays quiet while you edit', async ({ page }) => {
    // A paused stage is a preview of code being read with the caret and echo
    // announcements; describing it talks over them.
    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    const kinds = await kindsDuring(page, async () => {
        for (const text of ['hi', 'bye']) {
            await page.keyboard.press('ControlOrMeta+a');
            await page.keyboard.press('Backspace');
            await page.evaluate(
                (source) => navigator.clipboard.writeText(source),
                `Phrase('${text}')`,
            );
            await page.keyboard.press('ControlOrMeta+v');
            await page.waitForTimeout(2000);
        }
    });
    // A paste that silently no-ops leaves the program empty, which satisfies
    // "no stage announcements" for the wrong reason — so prove the edits landed.
    await expect
        .poll(async () => stripped((await editor.textContent()) ?? ''), {
            message: 'source did not load into the editor',
        })
        .toContain(stripped("Phrase('bye')"));
    // Editing announces its own edits (kind `command`), so an empty capture
    // would mean the observer saw nothing — not that the stage stayed quiet.
    expect(
        kinds.length,
        'editing should still announce something',
    ).toBeGreaterThan(0);
    expect(kinds.filter((kind) => kind.startsWith('stage-'))).toEqual([]);
});
