import { expect, test } from '../../playwright/fixtures';
import { v4 as uuidv4 } from 'uuid';
import { seedCollaborativeProject } from '../helpers/createCollaborativeProject';
import { loginNewContext, uidForUsername } from '../helpers/loginNewContext';

/**
 * E2E coverage for live coediting (#135). Two specific scenarios:
 *
 *   - **Same storage, two tabs**: a single user editing the same project in
 *     two tabs of the *same* browser context. localStorage is shared, so the
 *     per-device writer ID (Database.getWriterID) is identical across both
 *     tabs. If anything in the CRDT or presence stack keyed off that ID, the
 *     tabs would filter each other's traffic as self-writes — exactly the
 *     bug that motivated the per-session `sessionID` in ProjectsDatabase.
 *     This test exercises that path.
 *
 *   - **Different storage, two users**: two distinct users in two separate
 *     contexts, each with its own localStorage and Firebase Auth session.
 *     This is the canonical Google-Docs scenario: separate humans on
 *     separate devices coediting the same project. Verifies that edits
 *     propagate bidirectionally through `projects/{id}/updates` → the other
 *     side's Y.Doc → the editor's Source rebuild (the Y.Doc → Source bridge
 *     in ProjectsDatabase.activateCRDT).
 *
 * Both tests type a unique-per-run string in tab A and assert it appears in
 * tab B's editor. The unique string is necessary because the emulator may
 * retain prior-run state and `toContainText` would otherwise match leftover
 * content.
 */

/** How long we'll wait for a typed string to round-trip:
 *   - Editor → applyCRDTDiff: synchronous on keystroke
 *   - YjsFirestoreProvider flush debounce: ~200ms
 *   - addDoc to Firestore + emulator round-trip: ~50–200ms
 *   - Peer's onSnapshot fires: ~50ms
 *   - applyRemoteUpdate → onChange → history.edit → re-render: synchronous
 *
 * 8s is comfortable headroom for emulator latency variability under CI load. */
const PROPAGATION_TIMEOUT = 8_000;

/** Open a project and wait for its editor to be visible and ready. */
async function openProject(
    page: import('@playwright/test').Page,
    projectId: string,
) {
    await page.goto(`/en-US/project/${projectId}`);
    // The editor's keyboard-input textarea sits inside the source tile.
    // Waiting for the editor element itself (not the textarea, which may
    // be focused-but-empty) is enough to know hydration finished.
    await page.getByTestId('editor').first().waitFor();
}

/** Focus the source editor and type the given text at the current caret. */
async function typeInEditor(
    page: import('@playwright/test').Page,
    text: string,
) {
    // The textarea with class `keyboard-input` receives keystrokes, but the
    // caret span sits on top of it and intercepts pointer events, so a real
    // click() never lands. focus() bypasses pointer routing and triggers the
    // same onfocusin handler the editor uses to mark itself focused.
    await page.locator('textarea.keyboard-input').first().focus();
    await page.keyboard.type(text);
}

test('same browser context, two tabs, same user — edits propagate both ways', async ({
    page,
    loggedInUsername,
}) => {
    // Two pages inside one context = shared localStorage / IndexedDB / auth.
    // This is the path where the per-session sessionID matters: without it,
    // both tabs would use the same per-device writer for CRDT updates and
    // would filter each other's traffic as own-writes.
    //
    // Using the fixture's `page` and opening a second page from its context
    // guarantees both tabs share the same authenticated state without
    // having to thread storageState through manually (which is awkward
    // under exactOptionalPropertyTypes).
    const context = page.context();
    const ownerUid = await uidForUsername(loggedInUsername);
    const projectId = await seedCollaborativeProject(ownerUid);

    const tabA = page;
    const tabB = await context.newPage();
    await openProject(tabA, projectId);
    await openProject(tabB, projectId);

    // A → B
    const fromA = `aa${uuidv4().slice(0, 6)}`;
    await typeInEditor(tabA, fromA);
    await expect(tabB.getByTestId('editor').first()).toContainText(fromA, {
        timeout: PROPAGATION_TIMEOUT,
    });

    // B → A (proves the path works both directions, not just initiator → joiner)
    const fromB = `bb${uuidv4().slice(0, 6)}`;
    await typeInEditor(tabB, fromB);
    await expect(tabA.getByTestId('editor').first()).toContainText(fromB, {
        timeout: PROPAGATION_TIMEOUT,
    });

    await tabB.close();
});

test('two browser contexts, two users — edits propagate both ways', async ({
    browser,
}) => {
    // Two contexts each with their own storage = the canonical multi-user
    // scenario. Different per-device writer IDs, different Firebase Auth
    // sessions, different presence docs. The CRDT update stream and the
    // Y.Doc → Source bridge in activateCRDT have to do all the work.
    //
    // Usernames are stable per worker (NOT per run) so loginNewContext's
    // storage-state cache hits on retry — Firefox CI's full login flow is
    // ~7s per session, and two of them per attempt was eating most of
    // the 30s test timeout before assertions could run. Per-worker keys
    // still avoid collision with parallel workers; collision across runs
    // is fine because the project ID is fresh per run and the assertions
    // only check that fresh content propagates.
    const workerIndex = test.info().parallelIndex;
    const usernameA = `collab-a-${workerIndex}`;
    const usernameB = `collab-b-${workerIndex}`;
    const password = 'password';

    const sessionA = await loginNewContext(browser, usernameA, password);
    const sessionB = await loginNewContext(browser, usernameB, password);

    const projectId = await seedCollaborativeProject(sessionA.uid, sessionB.uid);

    await openProject(sessionA.page, projectId);
    await openProject(sessionB.page, projectId);

    // A → B
    const fromA = `aa${uuidv4().slice(0, 6)}`;
    await typeInEditor(sessionA.page, fromA);
    await expect(
        sessionB.page.getByTestId('editor').first(),
    ).toContainText(fromA, { timeout: PROPAGATION_TIMEOUT });

    // B → A
    const fromB = `bb${uuidv4().slice(0, 6)}`;
    await typeInEditor(sessionB.page, fromB);
    await expect(
        sessionA.page.getByTestId('editor').first(),
    ).toContainText(fromB, { timeout: PROPAGATION_TIMEOUT });

    await sessionA.context.close();
    await sessionB.context.close();
});
