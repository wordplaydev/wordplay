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
