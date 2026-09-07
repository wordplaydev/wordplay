import type { Page } from '@playwright/test';
import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { getTestDocument, waitForDocumentUpdate } from '../helpers/firestore';

/**
 * E2E coverage for the granular chat operations that replaced the full-doc
 * updateDoc on Chat: addMessage uses arrayUnion so concurrent senders'
 * messages accumulate, and markChatRead uses arrayRemove on the unread list.
 *
 * Plus the three things a message can now carry (#821, #820) — a reply's
 * parent, everyone's reactions, and the code it is about. Each is asserted on
 * the stored document rather than on the screen, because what matters is that
 * they survive the round trip through a shape the security rules permit.
 */

/** Send `text` in the open conversation and wait for it to land. */
async function send(page: Page, projectId: string, text: string) {
    const messageEditor = page.locator('#new-message');
    await messageEditor.waitFor();
    await messageEditor.click();
    await page.keyboard.type(text);
    await page
        .locator('button[aria-label^="send a message to your collaborators"]')
        .click();
    return waitForDocumentUpdate(
        page,
        'chats',
        projectId,
        (data) =>
            Array.isArray(data?.messages) &&
            data.messages.some((m: { text?: string }) => m?.text === text),
    );
}

test('the first message creates the chat and arrayUnions onto its messages array', async ({
    page,
}) => {
    const projectId = await createTestProject(page);

    // Open the collaborate (chat) panel.
    await page.getByTestId('collaborate-toggle').click();

    // A chat is made by talking, not by pressing a button first: the composer
    // is there before any chat document is.
    expect(await getTestDocument('chats', projectId)).toBeNull();

    // Wait for the message editor to render — it has id="new-message".
    const messageEditor = page.locator('#new-message');
    await messageEditor.waitFor();

    // Type a message and submit. The id is on the editor's wrapper, so clicking
    // it focuses the textarea inside.
    await messageEditor.click();
    await page.keyboard.type('Hello chat');

    // The composer is the rich markup editor (#1307), which renders what it will
    // look like rather than the markup. These assertions ride along here rather
    // than in a spec of their own: a Playwright test costs ~5s almost all of
    // which is navigation, and the app is already in exactly the needed state.
    const markup = page.locator('.markup-editor');
    await expect(markup).toBeVisible();

    // Select "Hello" and bold it with the keyboard. The delimiters go into the
    // model but are hidden in prose, so what is *rendered* stays "Hello chat".
    await page.keyboard.press('Home');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Control+b');
    await expect(markup.locator('.words.bold')).toHaveCount(1);

    // Source mode shows the markup it just wrote; prose mode hides it again.
    // Ctrl+Enter is the same command the toolbar's mode button dispatches.
    await page.keyboard.press('Control+Enter');
    await expect(markup).not.toHaveClass(/\bprose\b/);
    await expect(markup).toContainText('*Hello*');
    await page.keyboard.press('Control+Enter');
    await expect(markup).toHaveClass(/\bprose\b/);

    // A selection is drawn, not just held in the model: without the outline the
    // editor looked like Shift+Arrow did nothing at all. (Each highlight is two
    // SVGs, an outline and an underline, as the code editor renders it too.)
    await expect(markup.locator('.highlight.selected').first()).toBeVisible();

    // Toggling bold off leaves the message exactly as typed, so the assertion
    // below sees the same text it always did.
    await page.keyboard.press('Home');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Control+b');
    await expect(markup.locator('.words.bold')).toHaveCount(0);

    // Prose is rendered as prose, not as code: markup words lex as `literal`, so
    // without the prose rules every word was painted in the code font and the
    // code literal colour, and the editor looked nothing like the rendered text.
    const proseFont = await markup
        .locator('.token-view')
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(proseFont).not.toContain('Mono');

    // Undo restores what was typed. The plain textarea gave this for free, so
    // its absence was a regression the moment the rich editor went on.
    await page.keyboard.press('Control+z');
    await expect(markup).not.toContainText('Hello chat');
    await page.keyboard.press('Control+Shift+z');
    await expect(markup).toContainText('Hello chat');

    // Control+Home goes to the start of the message and leaves it intact. This
    // has to be checked in a browser: an unmatched keystroke deliberately bubbles
    // out of the editor so the app's global shortcuts still work from inside one,
    // and Control+Home reached the timeline's "step to the beginning", which
    // remounted the composer and silently discarded the message being written.
    await page.keyboard.press('Control+Home');
    await expect(markup).toContainText('Hello chat');

    // Clicking places the caret. The hidden mirror covers the whole editor, so
    // this only works while it declares `pointer-events: none`.
    const words = markup.locator('.token-view').first();
    const box = await words.boundingBox();
    if (box !== null) {
        await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
        await expect(markup.locator('.caret')).toBeVisible();
    }

    // The submit button's tip in en-US locale is "send a message to your
    // collaborators and " (trailing space is in the source). Match by prefix
    // to be resilient to whitespace tweaks.
    await page
        .locator('button[aria-label^="send a message to your collaborators"]')
        .click();

    const updatedChat = await waitForDocumentUpdate(
        page,
        'chats',
        projectId,
        (data) =>
            Array.isArray(data?.messages) &&
            data.messages.some(
                (m: { text?: string }) => m?.text === 'Hello chat',
            ),
    );
    const matching = (updatedChat?.messages as { text: string }[]).find(
        (m) => m.text === 'Hello chat',
    );
    expect(matching).toBeDefined();
});

/**
 * The markup editor's geometry and text-editing behavior, all of which is about
 * the browser — line boxes, client rects, pointer hit-testing, `Intl.Segmenter`
 * word boundaries — and so cannot be asserted anywhere cheaper. One navigation,
 * many assertions: a Playwright test costs ~5s of hydration whatever it checks.
 *
 * Every one of these was broken. The cause of most was the same: a paragraph of
 * prose is a SINGLE `Sym.Words` token, so a token's own box is the union of every
 * line it covers, and everything measured from it was as tall as the paragraph.
 */
test('the markup composer behaves like a text editor', async ({ page }) => {
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();
    await page.locator('#new-message').click();
    const markup = page.locator('.markup-editor');
    await markup.waitFor();

    // An EMPTY editor still shows a caret. Nothing is rendered in an empty
    // document — not one token — so every branch of `CaretView` gave up and the
    // composer looked broken and unfocusable before a single character existed.
    await expect(page.locator('.markup-editor .caret .bar')).toBeVisible();
    const emptyBox = await markup.boundingBox();
    if (emptyBox === null) throw new Error('the composer has no box');
    await page.mouse.click(emptyBox.x + 40, emptyBox.y + 12);
    await page.keyboard.type('hi');
    await expect(markup).toContainText('hi');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');

    // The mode control is a toggle, not a button: it has two modes, and a button
    // shows neither. Its label names the action from whichever mode it is in.
    // Not `.measure`: `OverflowToolbar` renders an inert clone of every item to
    // size them, and the clone carries the same ARIA.
    const mode = page.locator(
        '.overflow-toolbar > .item button[aria-pressed]',
        { hasText: '👁' },
    );
    await expect(mode).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+Enter');
    await expect(mode).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Control+Enter');
    await expect(mode).toHaveAttribute('aria-pressed', 'true');

    // Long enough to wrap to several lines in the composer, which is the whole
    // point: none of these bugs appear on a single line.
    const paragraph =
        'We are not a company. We are a community-based research project housed at a not-for-profit university, and we have no revenue. That means there are agreements we cannot sign.';
    await page.evaluate((text) => {
        const field = document.querySelector<HTMLTextAreaElement>(
            '.markup-editor textarea.keyboard-input',
        );
        if (field === null) return;
        field.focus();
        const data = new DataTransfer();
        data.setData('text/plain', text);
        field.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
    }, paragraph);
    await expect(markup).toContainText('not-for-profit');

    const lineHeight = await markup.evaluate(
        (el) => parseFloat(getComputedStyle(el).lineHeight) || 20,
    );
    const box = await markup.boundingBox();
    if (box === null) throw new Error('the composer has no box');
    // The paragraph must actually wrap, or none of this tests anything.
    expect(box.height).toBeGreaterThan(lineHeight * 2);

    const bar = () => page.locator('.markup-editor .caret .bar');

    // The caret at the start of a paragraph is one line tall. It took its height
    // from the token's union box, so it was as tall as the whole passage.
    await page.keyboard.press('Control+Home');
    const atStart = await bar().boundingBox();
    expect(atStart?.height).toBeLessThan(lineHeight * 1.5);

    // Control+Home is also the timeline's step-to-the-beginning, and an unmatched
    // keystroke bubbles out of the editor by design — it used to remount the
    // composer and discard the message being written.
    await expect(markup).toContainText('not-for-profit');

    // The caret at the END of the text is on the last line, not at the far edge
    // of the first: the position resolves to the `¶` wrapper, which is not
    // rendered, so it re-anchors to the previous token — by its union box, once.
    await page.keyboard.press('Control+End');
    const atEnd = await bar().boundingBox();
    expect(atEnd?.height).toBeLessThan(lineHeight * 1.5);
    expect(atEnd?.y).toBeGreaterThan((atStart?.y ?? 0) + lineHeight);

    // A click lands where it was aimed. The pointer code interpolated along the
    // token's total extent, which is exact only for monospace on one line.
    const target = { x: box.x + 120, y: box.y + lineHeight * 1.5 };
    await page.mouse.click(target.x, target.y);
    const clicked = await bar().boundingBox();
    expect(Math.abs((clicked?.x ?? 0) - target.x)).toBeLessThan(12);
    expect(
        Math.abs((clicked?.y ?? 0) + (clicked?.height ?? 0) / 2 - target.y),
    ).toBeLessThan(lineHeight);

    // Down then up returns to the same column, within a grapheme's width.
    await page.keyboard.press('ArrowDown');
    const down = await bar().boundingBox();
    expect(down?.y).toBeGreaterThan(clicked?.y ?? 0);
    await page.keyboard.press('ArrowUp');
    const back = await bar().boundingBox();
    expect(Math.abs((back?.x ?? 0) - (clicked?.x ?? 0))).toBeLessThan(12);

    const selection = () =>
        page.evaluate(() => {
            const field = document.querySelector<HTMLTextAreaElement>(
                '.markup-editor textarea.keyboard-input',
            );
            return field === null
                ? ''
                : field.value.slice(field.selectionStart, field.selectionEnd);
        });

    // Alt+Arrow moves by word — segmented, not scanned for spaces, so it works in
    // scripts that write none. Nothing in the app had word motion at all before.
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Alt+ArrowRight');
    await page.keyboard.press('Alt+Shift+ArrowRight');
    expect(await selection()).toBe(' are');

    // A one-word selection is drawn one line tall. Measured on the traced path:
    // the SVG's own box is larger than what it paints.
    const outline = await page
        .locator('.markup-editor .highlight.selected path')
        .first()
        .evaluate((el) =>
            el instanceof SVGGraphicsElement ? el.getBBox().height : 0,
        );
    expect(outline).toBeLessThan(lineHeight * 1.5);

    // Double-click selects a word, triple-click the paragraph. `pointerdown`
    // carries no click count, so this counts clicks itself.
    // Aimed from the caret rather than at a guessed pixel, so the press is
    // certainly inside a word and not in the space between two — and at a
    // different point from the click above, so the editor's own multi-click
    // counter starts a fresh gesture rather than continuing that one.
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Alt+ArrowRight');
    const afterFirstWord = await bar().boundingBox();
    if (afterFirstWord === null) throw new Error('no caret');
    const wordPoint = {
        x: afterFirstWord.x - 4,
        y: afterFirstWord.y + afterFirstWord.height / 2,
    };
    await page.mouse.dblclick(wordPoint.x, wordPoint.y);
    const word = await selection();
    expect(word.length).toBeGreaterThan(1);
    expect(word.trim()).toBe(word);
    // Three presses in one turn. Playwright's `clickCount` sets `detail` on a
    // single mousedown, which this editor deliberately ignores, and three
    // separate `mouse.click` calls are too far apart to be one gesture.
    await page.evaluate((at) => {
        const editor = document.querySelector('.markup-editor');
        if (editor === null) return;
        for (let i = 0; i < 3; i++)
            editor.dispatchEvent(
                new PointerEvent('pointerdown', {
                    clientX: at.x,
                    clientY: at.y,
                    button: 0,
                    buttons: 1,
                    bubbles: true,
                    cancelable: true,
                }),
            );
    }, wordPoint);
    expect((await selection()).length).toBeGreaterThan(word.length);

    // Select all, then delete it. `Caret.delete` returns the new source beside a
    // caret still built on the OLD one, so reading only the caret's source threw
    // the edit away and Backspace over a selection did nothing.
    await page.keyboard.press('Control+a');
    expect(await selection()).toBe(paragraph);
    await page.keyboard.press('Backspace');
    await expect(markup).not.toContainText('not-for-profit');

    // A link is made from a selection and its URL can be typed. It used to insert
    // `<label@>`, which is not a link at all — an empty URL cannot lex — so it
    // rendered as literal angle brackets, and typing into it made `@h` lex as a
    // concept reference, after which every further letter was refused.
    await page.keyboard.type('docs');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+k');
    await page.keyboard.type('https://x.dev');
    const linked = await page.evaluate(() => {
        const field = document.querySelector<HTMLTextAreaElement>(
            '.markup-editor textarea.keyboard-input',
        );
        return field?.value ?? '';
    });
    expect(linked).toBe('<docs@https://x.dev>');
    // And no anchor: one would swallow the pointerdown that places the caret, and
    // be a Tab stop inside `role="application"`.
    await expect(markup.locator('a')).toHaveCount(0);

    // A link still READS as a link, and so does a bare email — that is what an
    // anchor was doing for them, and dropping it left both looking like prose.
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(() => {
        const field = document.querySelector<HTMLTextAreaElement>(
            '.markup-editor textarea.keyboard-input',
        );
        if (field === null) return;
        field.focus();
        const data = new DataTransfer();
        data.setData(
            'text/plain',
            'read <the docs@https://example.com> or write hi@wordplay.dev now',
        );
        field.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
    });
    await expect(markup).toContainText('wordplay.dev');
    const linkLike = await markup.evaluate((editor) =>
        Array.from(editor.querySelectorAll('.token-view'))
            .filter(
                (token) =>
                    !token.classList.contains('hide') &&
                    getComputedStyle(token).textDecorationLine.includes(
                        'underline',
                    ),
            )
            .map((token) => token.textContent ?? ''),
    );
    expect(linkLike).toContain('the docs');
    expect(linkLike).toContain('hi@wordplay.dev');
    await expect(markup.locator('a')).toHaveCount(0);

    // Tab leaves. `role="application"` offers no other way out, so an editor that
    // consumes Tab is a keyboard trap.
    await expect(
        page.locator('.markup-editor textarea.keyboard-input'),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
        page.locator('.markup-editor textarea.keyboard-input'),
    ).not.toBeFocused();
});

/** The caret at the end of a paragraph, which is a caret in the `\n` SPACE after
 *  the paragraph's last token rather than in any token's text — a different
 *  branch of `CaretView` from the one the test above exercises, and one that also
 *  read the token's union box. */
test('the caret sits at the end of a paragraph, not past it', async ({
    page,
}) => {
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();
    await page.locator('#new-message').click();
    const markup = page.locator('.markup-editor');
    await markup.waitFor();

    await page.evaluate(() => {
        const field = document.querySelector<HTMLTextAreaElement>(
            '.markup-editor textarea.keyboard-input',
        );
        if (field === null) return;
        field.focus();
        const data = new DataTransfer();
        data.setData(
            'text/plain',
            "Are you deciding whether Wordplay is okay to use in your school or district? Here's what we can and can't promise.\n\nSecond paragraph.",
        );
        field.dispatchEvent(
            new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }),
        );
    });
    await expect(markup).toContainText('Second paragraph');

    // End of the FIRST paragraph, whose last line is short — which is what makes
    // the union box's far edge visibly wrong.
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('End');
    const caret = await page
        .locator('.markup-editor .caret .bar')
        .boundingBox();
    if (caret === null) throw new Error('no caret');

    // Where the text on the caret's own line ends.
    const lineEnd = await markup.evaluate((editor, top: number) => {
        let end = -Infinity;
        for (const token of editor.querySelectorAll('.token-view'))
            for (const rect of token.getClientRects())
                if (Math.abs(rect.top - top) < 4)
                    end = Math.max(end, rect.right);
        return end;
    }, caret.y);
    expect(lineEnd).toBeGreaterThan(0);
    expect(Math.abs(caret.x - lineEnd)).toBeLessThan(8);
});

test('a reply names the message it answers, and reacting keeps the array the same length', async ({
    page,
}) => {
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    const first = await send(page, projectId, 'Look at this');
    const root = (first?.messages as { id: string; text: string }[]).find(
        (m) => m.text === 'Look at this',
    );
    expect(root).toBeDefined();

    // Open the thread on that message. With no replies yet the control offers
    // to start one.
    await page
        .getByRole('button', { name: /^reply$/i })
        .first()
        .click();

    const replied = await send(page, projectId, 'Nice work');
    const reply = (
        replied?.messages as { text: string; replyTo?: string }[]
    ).find((m) => m.text === 'Nice work');
    // The reply names the root rather than being another message in the room.
    expect(reply?.replyTo).toBe(root?.id);

    // Back to the conversation. The thread covers it, so the messages beneath
    // are deliberately unreachable while it is open — which is what makes
    // leaving it part of this test rather than an afterthought.
    await page
        .getByRole('button', { name: 'back to the conversation' })
        .click();

    // React to the root. The picker offers a few emoji directly.
    await page
        .getByRole('button', { name: /^react$/i })
        .first()
        .click();
    // By test id rather than by name: the quick row names each reaction in the
    // reader's language, which depends on emoji data that loads asynchronously.
    await page.getByTestId('reaction-👍').click();

    const reacted = await waitForDocumentUpdate(
        page,
        'chats',
        projectId,
        (data) =>
            Array.isArray(data?.messages) &&
            data.messages.some(
                (m: { reactions?: Record<string, string[]> }) =>
                    m?.reactions?.['👍'] !== undefined,
            ),
    );
    // Assert the reaction itself, not just the message count. `waitForDocumentUpdate`
    // returns the last document it read rather than throwing when its predicate
    // never comes true, so a count-only assertion passes happily against a
    // feature that never wrote anything — which is exactly what it did.
    const root2 = (
        reacted?.messages as {
            id: string;
            reactions?: Record<string, string[]>;
        }[]
    ).find((m) => m.id === root?.id);
    expect(root2?.reactions?.['👍']).toHaveLength(1);
    // And reacting edits a message in place, so the conversation is still two
    // messages long — which is what the rules' size guard requires.
    expect((reacted?.messages as unknown[]).length).toBe(2);
});

test('a message can be about a line of code', async ({ page }) => {
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // Put the caret in the code, then say the message is about it. There is no
    // mode: the link lives on the message, and the editor stays editable.
    await page.locator('[role="application"]').first().click();
    await page
        .getByRole('button', { name: 'talk about the code where my cursor is' })
        .click();
    const referenced = await send(page, projectId, 'This line is repetitive');
    const message = (
        referenced?.messages as {
            text: string;
            reference?: { source: number; code: string };
        }[]
    ).find((m) => m.text === 'This line is repetitive');

    // The reference records which file and what the code read, which is what
    // lets it stay true — or go visibly stale — as the program changes.
    expect(message?.reference).toBeDefined();
    expect(message?.reference?.source).toBe(0);
    expect(typeof message?.reference?.code).toBe('string');
});

test('a marker in the gutter leads back to what was said', async ({ page }) => {
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // Say something about a line.
    await page.locator('[role="application"]').first().click();
    await page
        .getByRole('button', { name: 'talk about the code where my cursor is' })
        .click();
    await send(page, projectId, 'this line is repetitive');

    // The code now carries a marker rather than an outline, and pressing it
    // brings the message back — which is the whole point of the marker, since
    // an outline said something had been written and gave no way to read it.
    const marker = page.getByRole('button', {
        name: 'read the message about this code',
    });
    await expect(marker).toBeVisible();
    await marker.click();
    await expect(page.locator('.message.found, .message:focus')).toContainText(
        'this line is repetitive',
    );
});

test('a message can be only a link to some code', async ({ page }) => {
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    await page.locator('[role="application"]').first().click();
    await page
        .getByRole('button', { name: 'talk about the code where my cursor is' })
        .click();

    // No words typed: the link is the message.
    await page
        .locator('button[aria-label^="send a message to your collaborators"]')
        .click();
    const stored = await waitForDocumentUpdate(
        page,
        'chats',
        projectId,
        (data) =>
            Array.isArray(data?.messages) &&
            data.messages.some(
                (m: { reference?: unknown }) => m?.reference !== undefined,
            ),
    );
    // Name the reference, not the document: `waitForDocumentUpdate` hands back
    // whatever it last read on timeout, so `not.toBeNull()` is true of a
    // conversation that never changed.
    const linked = (
        stored?.messages as { text: string | null; reference?: unknown }[]
    ).find((m) => m.reference !== undefined);
    expect(linked).toBeDefined();
    expect(linked?.text).toBe('');
});

test('a thread holds the keyboard, and does not leak into the room behind it', async ({
    page,
}) => {
    // The thread is an overlay and the conversation stays mounted underneath,
    // so nothing stops a keyboard reader tabbing into messages they cannot see
    // unless the room is made inert. axe cannot see an overlay, which is why
    // this needs its own test rather than a scan.
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();
    await send(page, projectId, 'Look at this');

    await page
        .getByRole('button', { name: /^reply$/i })
        .first()
        .click();
    const back = page.getByRole('button', {
        name: 'back to the conversation',
    });
    await expect(back).toBeFocused();

    // Backwards from the thread's first control, which is the direction that
    // reaches the room: the overlay comes after the conversation in the DOM, so
    // tabbing forward leaves through the composer and never passes the messages
    // underneath. Shift+Tab from here used to land straight on them.
    for (let stop = 0; stop < 6; stop++) {
        await page.keyboard.press('Shift+Tab');
        const inRoom = await page.evaluate(() => {
            const active = document.activeElement;
            const scroller = document.querySelector(
                '.conversation > .scroller',
            );
            return active !== null && scroller !== null
                ? scroller.contains(active)
                : false;
        });
        expect(inRoom).toBe(false);
    }
});

test('the link names the file the caret was in, not the first one', async ({
    page,
}) => {
    // With one source the fallback "first editor" is accidentally right, which
    // is why every other test here would pass with the link pointing anywhere.
    // Wide enough that both editors stay open beside the chat; the default
    // viewport collapses the layout to one.
    await page.setViewportSize({ width: 1600, height: 1000 });
    const projectId = await createTestProject(page);
    await page.locator('[data-uiid="addSource"]').click();
    await expect(page.locator('[data-testid="editor"]')).toHaveCount(2);

    await page.getByTestId('collaborate-toggle').click();

    // Put the caret in the second file, ask for the link, and only then write.
    // Writing is what takes focus off the editor, and losing which editor had
    // it is what used to retarget the link to the first file.
    await page.locator('[data-id="source1"] [role="application"]').click();
    await page
        .getByRole('button', { name: 'talk about the code where my cursor is' })
        .click();
    const referenced = await send(page, projectId, 'about the second file');
    const message = (
        referenced?.messages as {
            text: string;
            reference?: { source: number };
        }[]
    ).find((m) => m.text === 'about the second file');
    expect(message?.reference?.source).toBe(1);
});
