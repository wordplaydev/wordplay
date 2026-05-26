import { v4 as uuidv4 } from 'uuid';
import { getTestFirestore } from './firestore';

/**
 * Seed a project owned by `ownerUid` with `collaboratorUid` as a
 * collaborator (or no collaborators when omitted, for same-user-two-tab
 * tests). Writes the project directly via the admin SDK at the v8
 * schema shape.
 *
 * # Why this duplicates Project.serialize's shape
 *
 * Production code uses `Project.make(...).serialize()` so the doc
 * always matches the current schema. We deliberately *don't* import
 * Project from this helper: Playwright's test loader rejects the
 * JSON import chain through DefaultLocale.ts ("needs an import
 * attribute of type: json"), and threading import-attribute support
 * through every test runner is more friction than this six-line
 * literal causes. The test fixture is allowed to be a little brittle
 * to schema bumps; if you add a new field to ProjectSchemaV8, update
 * this helper alongside it. The unit tests already cover the upgrade
 * chain, so this only has to track the *latest* shape.
 */
export async function seedCollaborativeProject(
    ownerUid: string,
    collaboratorUid?: string,
    initialCode = 'Phrase("hi")',
): Promise<string> {
    const id = uuidv4();
    const project = {
        v: 8 as const,
        id,
        name: 'Collab test',
        sources: [
            { names: 'start', code: initialCode, caret: 0 },
        ],
        locales: ['en-US'],
        owner: ownerUid,
        collaborators: collaboratorUid === undefined ? [] : [collaboratorUid],
        public: false,
        listed: true,
        archived: false,
        timestamp: Date.now(),
        persisted: true,
        gallery: null,
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
    };

    await getTestFirestore().collection('projects').doc(id).set(project);
    return id;
}
