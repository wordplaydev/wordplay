import { expect, test } from '@playwright/test';
import { createTestProject } from '../helpers/createProject';
import { grantClipboard } from '../helpers/clipboard';

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

    // Playing, it announces what the program produced. Control+Alt is AltGr on
    // Windows and Linux and Home/End on ChromeOS, so no command uses it.
    await page.keyboard.press('ControlOrMeta+Shift+Digit7');
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
    // Character echo itself is native (see the "editor echo mirrors" tests),
    // so what arrives in the immediate region is the caret description: it is
    // the `caret` kind and names the token the caret is in. Moving the caret
    // speaks at once; the description after typing is held until idle.
    await page.keyboard.press('ArrowLeft');
    const immediate = page.locator('.announcements.immediate');
    await expect(immediate).toHaveAttribute('data-kind', 'caret', {
        timeout: 15000,
    });
    await expect(immediate).toContainText('1');
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

    /** Empty the editor and wait until the mirror agrees, so each step starts from nothing. */
    async function clear(page: import('@playwright/test').Page) {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
        await expect
            .poll(async () => await mirror(page))
            .toEqual({ value: '', start: 0, end: 0 });
    }

    // One project for every case: each is a keystroke or two against an empty
    // editor, and a fresh project per case cost a page load apiece.
    test('typing, deleting, moving and breaking lines', async ({ page }) => {
        await createTestProject(page);
        const editor = page.getByTestId('editor').first();
        await editor.click();

        await test.step('typing lands in the field with the caret after it', async () => {
            await clear(page);
            await page.keyboard.type('abc');
            await expect
                .poll(async () => await mirror(page))
                .toEqual({ value: 'abc', start: 3, end: 3 });
        });

        await test.step('backspace shrinks the field and moves the selection', async () => {
            await clear(page);
            await page.keyboard.type('abc');
            await page.keyboard.press('Backspace');
            await expect
                .poll(async () => await mirror(page))
                .toEqual({ value: 'ab', start: 2, end: 2 });
        });

        await test.step('arrow keys move the selection without changing the value', async () => {
            await clear(page);
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

        await test.step('an auto-closed delimiter converges the field to the source', async () => {
            await clear(page);
            // The editor inserts the closing paren the browser didn't type; the
            // mirror must reconcile to the model, caret between the parens.
            await page.keyboard.type('(');
            await expect
                .poll(async () => await mirror(page))
                .toEqual({ value: '()', start: 1, end: 1 });
        });

        await test.step('Enter inserts a line natively', async () => {
            await clear(page);
            await page.keyboard.type('1');
            await page.keyboard.press('Enter');
            await page.keyboard.type('2');
            await expect
                .poll(async () => (await mirror(page)).value)
                .toBe('1\n2');
        });

        await test.step('a selection after an emoji counts code units, not graphemes', async () => {
            await clear(page);
            // A caret position counts graphemes and the field's selection counts UTF-16
            // code units, so before #1329 the collapsed caret landed inside the
            // surrogate pair and the platform echoed half a character.
            await page.keyboard.type('\u{1F600}1');
            await expect
                .poll(async () => await mirror(page))
                .toEqual({ value: '\u{1F600}1', start: 3, end: 3 });
            // The node selection spans the whole token, so its end converts too.
            await page.keyboard.press('ArrowLeft');
            await expect
                .poll(async () => await mirror(page))
                .toEqual({ value: '\u{1F600}1', start: 0, end: 3 });
        });

        await test.step('Shift+Enter still inserts a line through the input path', async () => {
            // Matches no command, so it flows through the input event — whose
            // line-break data is null by spec and named explicitly (parity with
            // the pre-mirror behavior). Enter above goes through a command
            // instead, so the two are different paths to the same result.
            await clear(page);
            await page.keyboard.type('1');
            await page.keyboard.press('Shift+Enter');
            await page.keyboard.type('2');
            await expect
                .poll(async () => (await mirror(page)).value)
                .toBe('1\n2');
        });
    });
});

test('clicking into the code announces where the caret landed', async ({
    page,
}) => {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.type('1 + 2');
    // Let the post-typing caret description land so the click's can differ from it.
    const immediate = page.locator('.announcements.immediate');
    await expect(immediate).toHaveAttribute('data-kind', 'caret', {
        timeout: 15000,
    });
    const before = await immediate.textContent();

    // A click is a caret move like any other, spoken once on the immediate
    // channel when the press is released — not a second time on the paced
    // one, which is what a separate `selection` announcement used to do.
    const paced = await kindsDuring(page, async () => {
        await editor.locator('.token-view').first().click();
        await expect
            .poll(
                async () => {
                    const text = await immediate.textContent();
                    return (
                        text !== null && text.trim() !== '' && text !== before
                    );
                },
                { timeout: 15000 },
            )
            .toBe(true);
    });
    expect(paced).not.toContain('selection');
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
    await grantClipboard(page);
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
        .toContain(stripped(code.split('\n')[0] ?? ''));
    // The reload below re-reads the project, so give the debounced save time
    // to land before navigating. A fixed wait, because the local copy landing
    // is not enough for a reload to find a signed-out project.
    await page.waitForTimeout(2000);
    await page.goto(`${base}?mode=play`, { waitUntil: 'domcontentloaded' });
    // The stage only receives keys when the output has focus, and the focusable
    // value only renders once the program is evaluating.
    const stage = page.locator('.value[tabindex="0"]').first();
    await stage.focus();
    await expect(stage).toBeFocused();
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
        // Poll rather than sleep. How long the paced region takes to present the
        // next message is the Announcer's business, not a number for this test to
        // guess at; what this test is about is that each message differs from the
        // last, which the sequence assertion below still says.
        await expect.poll(read).toBe(`Output ${key}`);
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
    // Poll, like every other reading here: how long the paced region takes to
    // present its first message is the Announcer's business, not a number for
    // this test to guess at.
    await expect.poll(read).toBe('Output P');
    await page.keyboard.press('a');
    await expect.poll(read).toBe('k a');
    await page.keyboard.press('b');
    await expect.poll(read).toBe('k b');
});

test('a program whose output never changes falls silent after describing itself', async ({
    page,
}) => {
    // Silence means "nothing changed" — the deliberate trade for dropping the
    // machinery that tried and failed to force a re-read.
    const read = await playing(page, '1 + 1');
    await expect.poll(read).toContain('2');
    const first = await read();
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
    // Tagged Spanish, so the same run also shows the phrase's words being read
    // in their own language inside an English description (#111).
    const read = await playing(page, String.raw`Phrase('\Key()\'/es)`);
    const kinds = await kindsDuring(page, async () => {
        for (const key of ['a', 'b']) {
            await page.keyboard.press(key);
            await page.waitForTimeout(1500);
        }
    });
    await expect(
        page.locator('.announcements.paced [lang="es"]'),
        "the phrase's words should be their own Spanish run",
    ).toHaveCount(1);
    // And the phrase's label, a sentence in the reader's language, must not be
    // read in the text's.
    await expect(page.locator('.phrase[aria-label][lang="es"]')).toHaveCount(0);
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
    await grantClipboard(page);
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
