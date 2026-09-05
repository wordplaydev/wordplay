import { v4 as uuidv4 } from 'uuid';
import { expect, test } from '../../playwright/fixtures';
import { getTestFirestore } from '../helpers/firestore';
import { loginNewContext, uidForUsername } from '../helpers/loginNewContext';

/**
 * E2E coverage for gallery curators' live access to student projects
 * (the teacher-scale incident): a teacher who curates a gallery must be able
 * to open a student's project and
 *
 *   - produce NO permission-denied console errors (the `updates` and
 *     `presence` subcollection rules grant read via canReadProject, exactly
 *     like the parent project doc);
 *   - appear present (curators may write their own presence doc — they can
 *     already update the project doc itself);
 *   - see the student's edits live (curators can read the CRDT updates
 *     stream);
 *   - NOT rewrite the student's doc: the older-schema backfill is gated on
 *     contributors, so a curator merely viewing a v8 doc leaves it at v8
 *     (before the fix, a teacher's client enqueued rewrites of every
 *     older-schema student project in every curated gallery).
 */

/** Console signatures of the incident; none may appear for the curator. */
const ErrorSignatures =
    /Missing or insufficient permissions|PresenceTracker|YjsFirestoreProvider/;

/** Worst-case ceiling for an edit to round-trip between two clients; see the
 *  rationale on the identical constant in collaborative-editing.spec.ts. */
const PROPAGATION_TIMEOUT = 20_000;

/** Seed a gallery curated by `curatorUid` containing one project owned by
 *  `ownerUid`, still at schema v8. Direct admin writes at the current schema
 *  shapes, for the same reason as seedCollaborativeProject: importing
 *  Project/Gallery here drags the app's JSON locale chain into Playwright's
 *  loader. If GallerySchema or ProjectSchema gain fields, update this seed. */
async function seedCuratedStudentProject(
    curatorUid: string,
    ownerUid: string,
): Promise<{ galleryId: string; projectId: string }> {
    const firestore = getTestFirestore();
    const galleryId = uuidv4();
    const projectId = uuidv4();
    await firestore
        .collection('galleries')
        .doc(galleryId)
        .set({
            v: 2,
            id: galleryId,
            path: null,
            name: { 'en-US': 'Curator Live Gallery' },
            description: { 'en-US': 'Seeded by curator-live-access.spec' },
            words: [],
            projects: [projectId],
            curators: [curatorUid],
            creators: [ownerUid],
            public: false,
            featured: false,
            howTos: [],
            howToExpandedVisibility: false,
            howToExpandedGalleries: [],
            howToViewers: {},
            howToViewersFlat: [],
            howToGuidingQuestions: [],
            howToReactions: {},
        });
    await firestore
        .collection('projects')
        .doc(projectId)
        .set({
            // v8 on purpose: one version behind, to observe that the curator's
            // client does NOT backfill it (only contributors do).
            v: 8,
            id: projectId,
            name: 'Student project',
            sources: [{ names: 'start', code: 'Phrase("hi")', caret: 0 }],
            locales: ['en-US'],
            owner: ownerUid,
            collaborators: [],
            public: false,
            listed: true,
            archived: false,
            timestamp: Date.now(),
            persisted: true,
            gallery: galleryId,
            flags: {
                dehumanization: null,
                violence: null,
                disclosure: null,
                misinformation: null,
            },
            nonPII: [],
            chat: null,
            history: [],
            restrictedGallery: false,
            viewers: [],
            commenters: [],
            stamps: { lamport: 0, fields: {} },
            crdt: null,
        });
    return { galleryId, projectId };
}

/** Poll the emulator until the project has a presence doc for the given
 *  user (or time out). */
async function waitForPresence(
    projectId: string,
    userId: string,
    timeoutMs = 15_000,
): Promise<boolean> {
    const firestore = getTestFirestore();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const snapshot = await firestore
            .collection('projects')
            .doc(projectId)
            .collection('presence')
            .where('userID', '==', userId)
            .limit(1)
            .get();
        if (!snapshot.empty) return true;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
}

test('a curator opens a student project with live access and no permission errors', async ({
    page,
    loggedInUsername,
    browser,
}) => {
    // Two full sessions plus a 20s propagation ceiling need headroom beyond
    // the default 30s.
    test.setTimeout(120_000);

    // The worker's signed-in user is the teacher; the student gets their own
    // context (own storage, auth session, and writer ID).
    const teacherUid = await uidForUsername(loggedInUsername);
    // A test-specific student: gallery seeds list the student as a gallery
    // creator, so a student account shared with the other test would stream
    // that test's docs through its own listeners and (correctly, as owner)
    // backfill them — racing that test's assertions.
    const student = await loginNewContext(
        browser,
        'curatorliveStudentLive',
        'password',
    );
    try {
        const { projectId } = await seedCuratedStudentProject(
            teacherUid,
            student.uid,
        );

        // Capture the teacher's console from before navigation; the incident
        // signatures must never appear.
        const suspiciousMessages: string[] = [];
        page.on('console', (message) => {
            if (ErrorSignatures.test(message.text()))
                suspiciousMessages.push(message.text());
        });

        // Teacher opens the student's project.
        await page.goto(`/en-US/project/${projectId}`);
        await page.getByTestId('editor').first().waitFor();

        // The teacher's presence write is allowed and lands.
        expect(await waitForPresence(projectId, teacherUid)).toBe(true);

        // The student edits in their own session; the curator sees it live
        // through the updates stream.
        const marker = `curatorsees${Date.now().toString(36)}`;
        await student.page.goto(`/en-US/project/${projectId}`);
        await student.page
            .locator('[data-testid="editor"]:not(.readonly)')
            .first()
            .waitFor();
        await student.page.locator('textarea.keyboard-input').first().focus();
        await student.page.keyboard.type(` "${marker}"`);
        await expect(page.getByTestId('editor').first()).toContainText(marker, {
            timeout: PROPAGATION_TIMEOUT,
        });

        // The curator never produced a permissions error, a presence failure,
        // or a Yjs subscription failure. (The curator-only schema test below
        // covers the no-rewrite guarantee.)
        expect(suspiciousMessages).toEqual([]);
    } finally {
        await student.context.close();
    }
});

test('a curator session does not mass-rewrite older-schema student projects it has not opened', async ({
    page,
    loggedInUsername,
    browser,
}) => {
    test.setTimeout(90_000);
    const teacherUid = await uidForUsername(loggedInUsername);
    // The student account only needs to exist to own the docs; they never
    // open them in this test. Test-specific (see the note in the live-access
    // test): a session signed in as this student would own these docs and
    // legitimately backfill them, defeating the assertion.
    const student = await loginNewContext(
        browser,
        'curatorliveStudentSchema',
        'password',
    );
    await student.context.close();

    // Two v8 student projects in the teacher's gallery. The teacher opens
    // only the first; the second reaches their client purely through the
    // curator gallery listener. Before the fix, the listener enqueued a
    // schema-upgrade rewrite of EVERY older-schema doc it streamed — the
    // teacher-scale mass-write storm. (The opened project may legitimately
    // be written: ProjectView persists an auto preview for any editable
    // viewer, curators included, and that write serializes at the latest
    // schema — so the unopened doc is the discriminating observation.)
    const opened = await seedCuratedStudentProject(teacherUid, student.uid);
    const unopened = await seedCuratedStudentProject(teacherUid, student.uid);

    await page.goto(`/en-US/project/${opened.projectId}`);
    await page.getByTestId('editor').first().waitFor();
    // Give the gallery listener, the tracked-project sweep, and the save
    // debounce (1s) ample time to have fired if the backfill were (wrongly)
    // enqueued for a curator.
    await page.waitForTimeout(6_000);

    const doc = await getTestFirestore()
        .collection('projects')
        .doc(unopened.projectId)
        .get();
    expect(doc.data()?.v).toBe(8);
});
