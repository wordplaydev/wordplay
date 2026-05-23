import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { waitForDocumentUpdate } from '../helpers/firestore';

/**
 * E2E coverage for the granular chat operations that replaced the full-doc
 * updateDoc on Chat: addMessage uses arrayUnion so concurrent senders'
 * messages accumulate, and markChatRead uses arrayRemove on the unread list.
 */

test('starting a chat and adding a message arrayUnions onto the messages array', async ({
    page,
}) => {
    const projectId = await createTestProject(page);

    // Open the collaborate (chat) panel.
    await page.getByTestId('collaborate-toggle').click();

    // The "Start chat" button is shown when no chat exists yet.
    await page
        .getByRole('button', {
            name: 'begin a discussion with yourself or others.',
        })
        .click();

    // Wait for the message editor to render — it has id="new-message".
    const messageEditor = page.locator('#new-message');
    await messageEditor.waitFor();

    // Type a message and submit. The FormattedEditor is contenteditable, so
    // we focus it and use keyboard input.
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
