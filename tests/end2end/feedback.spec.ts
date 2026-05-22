import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { v4 as uuidv4 } from 'uuid';
import { expect, test } from '../../playwright/fixtures';
import {
    getTestDocument,
    getTestFirestore,
    waitForDocumentUpdate,
} from '../helpers/firestore';

/** Reuses the auth-admin app if already initialized (calling initializeApp
 * twice with the default name throws). */
let authApp: ReturnType<typeof initializeApp> | null = null;
function getAuthAdmin() {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    if (authApp === null) {
        try {
            authApp = initializeApp(
                { projectId: 'demo-wordplay' },
                'auth-admin',
            );
        } catch (e) {
            // initializeApp throws if the named app exists; getAuth() works
            // either way once any app is initialized.
            void e;
        }
    }
    return getAuth(authApp ?? undefined);
}

/** The fixture user logs in via username; the actual Firebase email is
 * derived from it (see Creator.usernameEmail). We resolve the UID through the
 * auth emulator's admin API. */
async function getUidForUsername(username: string): Promise<string> {
    const email = `${username}@u.wordplay.dev`;
    const user = await getAuthAdmin().getUserByEmail(email);
    return user.uid;
}

/**
 * E2E coverage for the granular feedback operations introduced to replace the
 * full-doc setDoc that was vulnerable to lost updates on concurrent votes and
 * comments.
 */

async function seedFeedback(
    overrides: Partial<{
        votes: number;
        comments: unknown[];
        creator: string;
        title: string;
    }> = {},
) {
    const id = uuidv4();
    const feedback = {
        v: 2,
        id,
        creator: overrides.creator ?? 'seeded-creator',
        // Embed the id in the title so the test can disambiguate this row from
        // any other feedback the emulator carries forward between runs.
        title: overrides.title ?? `Seeded feedback ${id}`,
        description: 'Created by the test harness to exercise CRUD ops.',
        type: 'idea' as const,
        status: 'open' as const,
        created: Date.now(),
        url: '',
        browser: '',
        logs: '',
        votes: overrides.votes ?? 1,
        github: null,
        comments: overrides.comments ?? [],
    };
    await getTestFirestore().collection('feedback').doc(id).set(feedback);
    return { id, title: feedback.title };
}

async function openFeedbackDialog(page: import('@playwright/test').Page) {
    await page.goto('/en-US/');
    // The Feedback dialog button is rendered by Page.svelte's Settings toolbar
    // and is identified by its tooltip ("Show the feedback form.").
    await page
        .getByRole('button', { name: 'Show the feedback form.' })
        .click();
    // The feedback list renders inside the dialog; wait for the mode toggle
    // ("ideas" radio) to appear and switch to it — the seeded feedback uses
    // type='idea', and the dialog defaults to type='defect'. The Mode widget
    // uses role="radio" rather than button.
    const ideasTab = page.getByRole('radio', {
        name: 'suggest new features or improvements',
    });
    await ideasTab.waitFor();
    await ideasTab.click();
}

test('voting on feedback atomically increments the votes counter', async ({
    page,
}) => {
    const { id: feedbackId, title } = await seedFeedback({ votes: 3 });

    await openFeedbackDialog(page);

    // Scope the like click to the row whose title matches our seeded feedback;
    // other rows from prior tests may still be in the emulator.
    const row = page
        .locator('.feedback')
        .filter({ hasText: title });
    // Use the aria-label attribute directly rather than getByRole, because the
    // row's header element is also role=button and its computed accessible
    // name encompasses the like button's label, which would otherwise match.
    await row.locator('button[aria-label="Like this feedback"]').click();

    const updated = await waitForDocumentUpdate(
        page,
        'feedback',
        feedbackId,
        (data) => data?.votes === 4,
    );
    expect(updated?.votes).toBe(4);
});

test('adding a comment on feedback appends to the comments array', async ({
    page,
    loggedInUsername,
}) => {
    // Firestore rules restrict feedback updates affecting `comments` to the
    // feedback's creator or a moderator, so seed feedback owned by the test
    // user (the realistic "user comments on their own item" case).
    const userUid = await getUidForUsername(loggedInUsername);
    const { id: feedbackId, title } = await seedFeedback({ creator: userUid });

    await openFeedbackDialog(page);

    // Expand the row by focusing the .header (role=button) and pressing Enter.
    // The header div has onkeydown for Enter; we can't reliably click it as a
    // visible-text target because the title is rendered inside an input when
    // the row is editable.
    const row = page
        .locator('.feedback')
        .filter({ hasText: title });
    const header = row.locator('.header');
    await header.focus();
    await header.press('Enter');

    const commentField = page.locator(`#new-comment-${feedbackId}`);
    await commentField.waitFor();
    await commentField.fill('Looks great');

    await row
        .locator('button[aria-label="submit comment on this feedback."]')
        .click();

    const updated = await waitForDocumentUpdate(
        page,
        'feedback',
        feedbackId,
        (data) =>
            Array.isArray(data?.comments) &&
            data.comments.some(
                (c: { text?: string }) => c?.text === 'Looks great',
            ),
    );
    const matching = (updated?.comments as { text: string }[]).find(
        (c) => c.text === 'Looks great',
    );
    expect(matching).toBeDefined();
});

test('deleting a comment removes it from the comments array', async ({
    page,
    loggedInUsername,
}) => {
    // Resolve the test user's UID via the auth emulator. We need the UID to
    // seed a comment attributable to this user so the delete button is shown
    // (the comment's `creator` field must match the signed-in user).
    const userUid = await getUidForUsername(loggedInUsername);

    const existingComment = {
        creator: userUid,
        text: 'Comment to remove',
        created: 1700000000000,
        moderator: false,
    };
    // Seed feedback as owned by the test user — rules only let creators/mods
    // update the comments array.
    const { id: feedbackId, title } = await seedFeedback({
        creator: userUid,
        comments: [existingComment],
    });

    await openFeedbackDialog(page);

    const row = page
        .locator('.feedback')
        .filter({ hasText: title });
    const header = row.locator('.header');
    await header.focus();
    await header.press('Enter');

    // The same tip ("Delete your feedback.") is used by BOTH the feedback's
    // own delete button (in the header) and the per-comment delete button.
    // Scope to the .comment row to avoid hitting the feedback delete instead.
    const deleteButton = row
        .locator('.comment')
        .locator('button[aria-label="Delete your feedback."]');
    await deleteButton.click();
    await deleteButton.click();

    const updated = await waitForDocumentUpdate(
        page,
        'feedback',
        feedbackId,
        (data) =>
            Array.isArray(data?.comments) && data.comments.length === 0,
    );
    expect(updated?.comments).toEqual([]);

    // Sanity: the document itself still exists.
    const stillThere = await getTestDocument('feedback', feedbackId);
    expect(stillThere).not.toBeNull();
});
