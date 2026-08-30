import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Character } from '../src/db/characters/Character';
import Gallery from '../src/db/galleries/Gallery';
import Project from '../src/db/projects/Project';
import DefaultLocale from '../src/locale/DefaultLocale';
import Source from '../src/nodes/Source';
import { SEED_PROJECTS, type SeedProject } from './seedProjects';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Use the modular API (getAuth/getFirestore), not the legacy `admin.auth()`
// namespace accessor — firebase-admin v14 removed it, and calling it threw on
// every seed run (masked by the probe loop as "emulator never came up").
initializeApp({ projectId: 'demo-wordplay' });

/**
 * The seed sets up:
 *   - A grab-bag of users with predictable UIDs and custom claims
 *     (teacher, mod) so manual emulator sessions and e2e tests don't have to
 *     mint claims or rely on randomly generated identities.
 *   - A demo class with an associated class gallery, owned by the teacher
 *     and populated with the seeded students. This is enough state to
 *     manually exercise teacher flows (add/remove students, gallery share)
 *     without clicking through a fresh setup each time.
 *   - A batch of creator-owned projects and public galleries, so pages that
 *     scroll (project listings, gallery directory) have enough content to
 *     exercise pagination, virtualized lists, and the back-to-top button.
 *
 * Every step is idempotent: it tolerates "already exists" errors and uses
 * stable document IDs so the script can be re-run alongside an existing
 * emulator state without destroying data.
 */

// Helper: every seeded password is the same so manual login is uniform.
const PASSWORD = 'password';

type SeededUser = {
    uid: string;
    username: string;
    displayName: string;
    claims: Record<string, boolean> | null;
};

/** Seeded user definitions. Keep UIDs short, descriptive, and stable.
 *
 *  `displayName` is a creator's chosen *character*, which the app renders as a
 *  glyph beside their username — not a label. Seeding words there made every
 *  surface that draws a creator look like it rendered names, and one of them
 *  ('✎', the same glyph as EDIT_SYMBOL) read as an edit-privilege badge in the
 *  collaborate tile's table. */
const SEEDED_USERS: SeededUser[] = [
    {
        uid: 'creator0000000000000000000001',
        username: 'creator',
        displayName: '🐙',
        claims: null,
    },
    {
        // Second creator for manual testing of collaborative editing
        // (#135). Paired with `creator` on SEEDED_COLLAB_PROJECT_ID below
        // so two emulator browser sessions can open the same project and
        // exercise the presence + CRDT flows.
        uid: 'creator0000000000000000000002',
        username: 'creator2',
        displayName: '🦊',
        claims: null,
    },
    {
        uid: 'seeded-teacher-uid-00000000001',
        username: 'teacher',
        displayName: '🦉',
        claims: { teacher: true },
    },
    {
        uid: 'seeded-mod-uid-000000000000001',
        // Not 'mod': the login field requires at least UsernameLength (5)
        // characters, so a three-letter username can be seeded but never
        // typed in.
        username: 'moderator',
        displayName: '🐻',
        claims: { mod: true },
    },
    {
        uid: 'seeded-student-uid-00000000001',
        username: 'student1',
        displayName: '🐣',
        claims: null,
    },
    {
        uid: 'seeded-student-uid-00000000002',
        username: 'student2',
        displayName: '🐥',
        claims: null,
    },
];

/**
 * Stable ID for the shared collaborative-editing test project. Owned by
 * `creator`, with `creator2` as a collaborator, so logging in as either
 * one and opening /project/{this id} drops you straight into a project
 * the other can also edit. The fixed ID means both browser windows can
 * navigate to the same URL without copy-pasting.
 */
const SEEDED_COLLAB_PROJECT_ID = 'seed-collab-project';

/** Stable IDs for the demo class + gallery so tests can reference them directly. */
const SEEDED_CLASS_ID = 'seeded-class-id';
const SEEDED_CLASS_GALLERY_ID = 'seeded-class-gallery-id';

/** Stable IDs for the creator-owned how-to workshop (class + gallery). Used
 *  for manual testing of the how-to editor / drafts list with enough fixture
 *  content to exercise multi-draft + multi-published layouts. */
const SEEDED_HOWTO_CLASS_ID = 'seeded-howto-class-id';
const SEEDED_HOWTO_GALLERY_ID = 'seeded-howto-gallery-id';

/**
 * Themes for creator-owned public galleries. There are deliberately more
 * galleries than seed projects: the first few get a project each, and the rest
 * stay empty so the galleries page has enough rows to scroll and so the
 * no-project preview placeholder is exercised. The projects themselves live in
 * `seedProjects.ts`.
 */
const PUBLIC_GALLERY_THEMES = [
    'Beginnings',
    'Motion Studies',
    'Color Experiments',
    'Typography Playground',
    'Weather Patterns',
    'Cosmic Designs',
    'Word Art',
    'Rhythm and Pulse',
    'Wave Forms',
    'Botanical Sketches',
];

const isAlreadyExists = (err: unknown): boolean => {
    const code = (err as { code?: string } | null)?.code;
    return (
        code === 'auth/uid-already-exists' ||
        code === 'auth/email-already-exists'
    );
};

/** Whether the error is just the emulator not yet listening on its port. This
 *  is the expected case while the emulator boots, so we log it quietly rather
 *  than dumping the whole firebase-admin request object. */
const isConnectionRefused = (err: unknown): boolean => {
    const top = err as { code?: string; cause?: { code?: string } } | null;
    return (
        top?.code === 'app/network-error' || top?.cause?.code === 'ECONNREFUSED'
    );
};

/** How long to wait for the auth emulator before giving up. CI runners under
 *  load can be slow to bind the auth port, so this is generous (~2 min); it's
 *  well within the e2e job's 60-minute timeout. */
const MAX_PROBE_ATTEMPTS = 120;

/** Wait for the auth emulator to come up, then create the seeded users. Throws
 *  if the emulator never responds, so the caller can fail the whole run loudly
 *  instead of letting tests run against an unseeded (empty) emulator. */
async function seedUsers(): Promise<void> {
    for (let attempt = 0; attempt < MAX_PROBE_ATTEMPTS; attempt++) {
        try {
            // Probe the emulator with the first user; if it succeeds (or that
            // user already exists) the emulator is up and we can seed the rest.
            const first = SEEDED_USERS[0];
            try {
                await getAuth().createUser({
                    uid: first.uid,
                    email: `${first.username}@u.wordplay.dev`,
                    displayName: first.displayName,
                    password: PASSWORD,
                    emailVerified: true,
                });
                console.log(`[seed] Created user "${first.username}"`);
            } catch (err) {
                if (!isAlreadyExists(err)) throw err;
            }
            break;
        } catch (err) {
            // A refused connection just means the emulator is still booting, so
            // note it once on the first attempt as a one-liner. For anything
            // else (e.g. a firebase-admin API change), surface the full error
            // instead of misreporting it as a timeout after every attempt.
            if (attempt === 0) {
                if (isConnectionRefused(err))
                    console.log('[seed] Waiting for auth emulator…');
                else console.error('[seed] Auth probe failed, retrying:', err);
            }
            if (attempt === MAX_PROBE_ATTEMPTS - 1) {
                throw new Error(
                    `[seed] Auth emulator never came up after ${MAX_PROBE_ATTEMPTS} attempts; last error: ${err instanceof Error ? err.message : String(err)}`,
                );
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    for (const user of SEEDED_USERS.slice(1)) {
        try {
            await getAuth().createUser({
                uid: user.uid,
                email: `${user.username}@u.wordplay.dev`,
                displayName: user.displayName,
                password: PASSWORD,
                emailVerified: true,
            });
            console.log(`[seed] Created user "${user.username}"`);
        } catch (err) {
            if (!isAlreadyExists(err)) {
                console.error(`[seed] Failed to create ${user.username}:`, err);
                continue;
            }
            // Already there — reconcile it rather than leaving it as it was.
            // Users are keyed by uid, so renaming one here would otherwise
            // never reach an emulator that had already been seeded, and the
            // old name would keep working while the new one didn't exist.
            try {
                await getAuth().updateUser(user.uid, {
                    email: `${user.username}@u.wordplay.dev`,
                    displayName: user.displayName,
                    password: PASSWORD,
                    emailVerified: true,
                });
            } catch (updateErr) {
                console.error(
                    `[seed] Failed to update ${user.username}:`,
                    updateErr,
                );
            }
        }
    }

    // Set custom claims for users that need them. setCustomUserClaims is safe
    // to call repeatedly and overwrites prior claims, so it doesn't need an
    // existence check.
    for (const user of SEEDED_USERS) {
        if (user.claims) {
            await getAuth().setCustomUserClaims(user.uid, user.claims);
            console.log(
                `[seed] Set claims on "${user.username}": ${JSON.stringify(user.claims)}`,
            );
        }
    }
}

/** Seed a class document and a class-associated gallery. */
async function seedClassAndGallery(): Promise<void> {
    const firestore = getFirestore();

    const teacher = SEEDED_USERS.find((u) => u.username === 'teacher');
    const students = SEEDED_USERS.filter((u) =>
        u.username.startsWith('student'),
    );
    if (!teacher) throw new Error('Teacher user missing from SEEDED_USERS');

    const classDoc = {
        id: SEEDED_CLASS_ID,
        name: 'Demo Class',
        description: 'A seeded class for manual emulator testing.',
        teachers: [teacher.uid],
        learners: students.map((s) => s.uid),
        info: students.map((s) => ({
            uid: s.uid,
            username: s.username,
            meta: [''],
        })),
        galleries: [SEEDED_CLASS_GALLERY_ID],
    };

    // Use Gallery.make so the serialized shape always matches the
    // current schema — same future-proofing rationale as Project.make
    // above. The .data field is the serialized form.
    const galleryDoc = Gallery.make(
        SEEDED_CLASS_GALLERY_ID,
        { 'en-US': 'Demo Class Gallery' },
        { 'en-US': 'Seeded gallery for the demo class.' },
        [teacher.uid],
        students.map((s) => s.uid),
    ).data;

    // setDoc overwrites whatever's there — fine for seeding because we want a
    // known starting state on every emulator start.
    await firestore.collection('classes').doc(SEEDED_CLASS_ID).set(classDoc);
    console.log(`[seed] Wrote class "${SEEDED_CLASS_ID}"`);

    await firestore
        .collection('galleries')
        .doc(SEEDED_CLASS_GALLERY_ID)
        .set(galleryDoc);
    console.log(`[seed] Wrote gallery "${SEEDED_CLASS_GALLERY_ID}"`);
}

function makePublicProject(
    seed: SeedProject,
    index: number,
    ownerUid: string,
    galleryId: string,
) {
    // Use Project.make so the serialized shape always matches the
    // current schema — no risk of v5/v6/v7/v8 drift if the schema
    // bumps again later. Project.make defaults handle stamps, crdt,
    // history, viewers, commenters, flags, etc.
    return Project.make(
        seed.id,
        seed.name,
        new Source('start', seed.code),
        [],
        DefaultLocale,
        ownerUid, // owner
        [], // collaborators
        true, // public
        undefined, // carets
        true, // listed
        false, // archived
        true, // persisted
        galleryId, // gallery
        undefined, // flags — defaults to unknownFlags()
        Date.now() - index * 1000, // timestamp
    ).serialize();
}

function makePublicGallery(
    index: number,
    curatorUid: string,
    /** The gallery's project, or undefined for a deliberately empty gallery. */
    projectId: string | undefined,
) {
    // Gallery.isBuiltIn() treats hyphen-free IDs as built-ins, so the ID must
    // contain a hyphen. Stable IDs keep the seed idempotent across reruns.
    const id = `seed-public-gallery-${String(index).padStart(2, '0')}`;
    const theme = PUBLIC_GALLERY_THEMES[index] ?? `Gallery ${index}`;
    return Gallery.make(
        id,
        { 'en-US': theme },
        {
            'en-US': `A seeded public gallery for testing (#${index + 1}).`,
        },
        [curatorUid],
        [curatorUid],
        {
            words: theme.toLowerCase().split(/\s+/),
            projects: projectId === undefined ? [] : [projectId],
            public: true,
            howToGuidingQuestions: HOWTO_GUIDING_QUESTIONS,
            howToReactions: HOWTO_REACTIONS,
        },
    ).data;
}

/**
 * A project shared between `creator` (owner) and `creator2` (collaborator)
 * for manual testing of collaborative editing (#135). Both users can edit
 * the same project at /project/{SEEDED_COLLAB_PROJECT_ID}, so opening it
 * in two browser windows — one signed in as each — exercises the live
 * coediting flow: per-field stamp merge for metadata, Yjs CRDT for
 * source code, and the presence overlay (floating remote carets +
 * footer chip row).
 *
 * Written at v8 (the current schema): empty stamps, null CRDT snapshot.
 * The first edit from either browser bumps stamps and writes a real
 * `crdt` snapshot.
 */
async function seedCollaborativeProject(): Promise<void> {
    const firestore = getFirestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    const creator2 = SEEDED_USERS.find((u) => u.username === 'creator2');
    if (!creator || !creator2)
        throw new Error('creator or creator2 missing from SEEDED_USERS');

    // Use Project.make so the serialized shape always matches the
    // current schema. Project.make's defaults handle stamps, crdt,
    // and every other field future schema bumps might add — no
    // risk of stale literals in this file when the schema moves.
    const project = Project.make(
        SEEDED_COLLAB_PROJECT_ID,
        'Shared Sketch',
        new Source('start', 'Phrase("Type here together!")'),
        [],
        DefaultLocale,
        creator.uid, // owner
        [creator2.uid], // collaborators
        false, // public
        undefined, // carets
        true, // listed
        false, // archived
        true, // persisted
        null, // gallery
    ).serialize();

    await firestore
        .collection('projects')
        .doc(SEEDED_COLLAB_PROJECT_ID)
        .set(project);
    console.log(
        `[seed] Wrote collaborative project "${SEEDED_COLLAB_PROJECT_ID}" (owner: ${creator.username}, collaborator: ${creator2.username})`,
    );
}

/** Titles for the seeded how-tos. Length controls how many are created. */
const HOWTO_TITLES = [
    'Make a phrase pulse',
    'Use color to set mood',
    'Animate text along a path',
    'Layer shapes for depth',
    'Loop a stream forever',
    'Sync motion to music',
    'Type ahead like a typewriter',
    'Bounce a ball off the walls',
    'Build a rainfall effect',
    'Spin letters one by one',
    'Wave words like a flag',
    'Stack three colors on a page',
    'React when the user clicks',
    'Read keystrokes as input',
    'Switch scenes on a timer',
];

const HOWTO_GUIDING_QUESTIONS = [
    'What did you make?',
    'What was tricky and how did you solve it?',
    'What could someone try next?',
];

const HOWTO_REACTIONS: Record<string, string> = {
    '👍': 'like',
    '💡': 'gave me an idea',
    '❓': 'have a question',
};

/**
 * Seed a class + gallery + many how-tos all owned by `creator`. The class
 * lists `creator` as the sole teacher; the gallery has `creator` as both
 * curator and creator so they can edit and view everything. Roughly two
 * thirds of the how-tos are published (laid out on a small grid on the
 * canvas) and one third are drafts (so the drafts list also has content).
 *
 * Sized for hand-testing the how-to editor flows: multi-draft autosave,
 * cross-document state isolation, the drafts list, and the published-canvas
 * preview.
 */
async function seedCreatorHowTos(): Promise<void> {
    const firestore = getFirestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    if (!creator) throw new Error('Creator user missing from SEEDED_USERS');

    const classDoc = {
        id: SEEDED_HOWTO_CLASS_ID,
        name: 'Creator Workshop',
        description:
            'A seeded class with many how-tos owned by `creator`, for manual testing of the how-to editor.',
        teachers: [creator.uid],
        learners: [],
        info: [],
        galleries: [SEEDED_HOWTO_GALLERY_ID],
    };
    await firestore
        .collection('classes')
        .doc(SEEDED_HOWTO_CLASS_ID)
        .set(classDoc);
    console.log(`[seed] Wrote class "${SEEDED_HOWTO_CLASS_ID}"`);

    const howToIds = HOWTO_TITLES.map(
        (_, i) => `seed-howto-${String(i).padStart(2, '0')}`,
    );

    // Use Gallery.make so the serialized shape always matches the
    // current schema; opts.howTos pre-links the gallery to the docs we're
    // about to write below.
    const galleryDoc = Gallery.make(
        SEEDED_HOWTO_GALLERY_ID,
        { 'en-US': 'Creator Workshop Gallery' },
        {
            'en-US':
                'Seeded gallery for the Creator Workshop class, populated with how-tos.',
        },
        [creator.uid], // curators
        [creator.uid], // creators
        {
            howTos: howToIds,
            howToGuidingQuestions: HOWTO_GUIDING_QUESTIONS,
            howToReactions: HOWTO_REACTIONS,
        },
    ).data;
    await firestore
        .collection('galleries')
        .doc(SEEDED_HOWTO_GALLERY_ID)
        .set(galleryDoc);
    console.log(`[seed] Wrote gallery "${SEEDED_HOWTO_GALLERY_ID}"`);

    // Use the constant Date.now() once so all publishedAt timestamps are
    // relative to a single point — keeps the seed deterministic across
    // runs as long as the clock is monotonic.
    const now = Date.now();

    const batch = firestore.batch();
    for (let i = 0; i < HOWTO_TITLES.length; i++) {
        const id = howToIds[i];
        const title = HOWTO_TITLES[i];
        // Every 3rd how-to is a draft so the drafts list has something to
        // show alongside the canvas-rendered published ones.
        const published = i % 3 !== 0;
        // Lay published how-tos out on a 5-column grid; drafts get (0,0)
        // since they don't render on the canvas.
        const xcoord = published ? (i % 5) * 250 : 0;
        const ycoord = published ? Math.floor(i / 5) * 250 : 0;
        const howToDoc = {
            v: 2,
            id,
            galleryId: SEEDED_HOWTO_GALLERY_ID,
            published,
            publishedAt: published ? now - i * 60_000 : null,
            xcoord,
            ycoord,
            title: `¶${title}¶/en-US`,
            guidingQuestions: HOWTO_GUIDING_QUESTIONS,
            text: HOWTO_GUIDING_QUESTIONS.map(
                (_, qi) =>
                    `¶Example answer ${qi + 1} for "${title}". (Seeded content — edit me!) \n\n\\Phrase("hello world")\\¶/en-US`,
            ),
            creator: creator.uid,
            collaborators: [],
            viewers: {},
            viewersFlat: [],
            scopeOverwrite: false,
            locales: ['en-US'],
            isPublic: false,
            social: {
                v: 1,
                notifySubscribers: true,
                reactionOptions: HOWTO_REACTIONS,
                reactions: Object.fromEntries(
                    Object.keys(HOWTO_REACTIONS).map((emoji) => [emoji, []]),
                ),
                usedByProjects: [],
                chat: null,
                bookmarkers: [],
                submittedToGuide: false,
                seenByUsers: [creator.uid],
                viewCount: 0,
            },
        };
        batch.set(firestore.collection('howtos').doc(id), howToDoc);
    }
    await batch.commit();
    console.log(
        `[seed] Wrote ${HOWTO_TITLES.length} how-tos in gallery "${SEEDED_HOWTO_GALLERY_ID}" (owner: ${creator.username})`,
    );
}

/**
 * Seed creator-owned public galleries, giving the first few a project each from
 * `SEED_PROJECTS`. There are more galleries than projects on purpose: the extra
 * empty ones keep the gallery directory long enough to exercise scrolling and
 * the back-to-top button, and cover the no-project preview placeholder.
 */
async function seedPublicProjectsAndGalleries(): Promise<void> {
    const firestore = getFirestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    if (!creator) throw new Error('Creator user missing from SEEDED_USERS');

    const batch = firestore.batch();
    for (let i = 0; i < PUBLIC_GALLERY_THEMES.length; i++) {
        // Every index gets a gallery; only the first SEED_PROJECTS.length of
        // them get a project, leaving the rest empty on purpose.
        const seed = SEED_PROJECTS[i];
        const gallery = makePublicGallery(i, creator.uid, seed?.id);
        batch.set(firestore.collection('galleries').doc(gallery.id), gallery);
        if (seed !== undefined) {
            const project = makePublicProject(seed, i, creator.uid, gallery.id);
            batch.set(
                firestore.collection('projects').doc(project.id),
                project,
            );
        }
    }
    await batch.commit();

    console.log(
        `[seed] Wrote ${SEED_PROJECTS.length} public projects and ${PUBLIC_GALLERY_THEMES.length} public galleries owned by "${creator.username}"`,
    );
}

/** Stable ID for an expanded-scope gallery: curated by `teacher`, with how-to
 *  expanded visibility on and `creator` in the viewers — so `creator` gets
 *  read-only how-to access (the expandedScopeGalleries path). */
const SEEDED_EXPANDED_GALLERY_ID = 'seeded-expanded-scope-gallery-id';

/** Deterministic, schema-valid (v4-shaped) UUID for stable character IDs. */
const seedUUID = (n: number): string =>
    `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Seed custom characters owned by `creator` (one private, shared with
 *  `creator2`) so the characters page / glyph picker and the character
 *  realtime listener have content. Each has real geometry on the 32x32
 *  canvas: an empty `shapes` list is schema-valid but paints nothing, which
 *  reads as a broken picker rather than as seeded content. */
async function seedCharacters(): Promise<void> {
    const firestore = getFirestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    const creator2 = SEEDED_USERS.find((u) => u.username === 'creator2');
    if (!creator || !creator2) throw new Error('creator/creator2 missing');
    const now = Date.now();
    const characters: Character[] = [
        {
            id: seedUUID(1),
            owner: creator.uid,
            public: true,
            collaborators: [],
            updated: now,
            name: `${creator.username}/Star`,
            description: '',
            // A five pointed star: outer radius 14 and inner radius 6 around
            // the canvas center, starting at the top point.
            shapes: [
                {
                    type: 'path',
                    closed: true,
                    fill: { l: 0.85, c: 90, h: 95 },
                    points: [
                        { x: 16, y: 2 },
                        { x: 19.5, y: 11.1 },
                        { x: 29.3, y: 11.7 },
                        { x: 21.7, y: 17.9 },
                        { x: 24.2, y: 27.3 },
                        { x: 16, y: 22 },
                        { x: 7.8, y: 27.3 },
                        { x: 10.3, y: 17.9 },
                        { x: 2.7, y: 11.7 },
                        { x: 12.5, y: 11.1 },
                    ],
                },
            ],
        },
        {
            id: seedUUID(2),
            owner: creator.uid,
            public: false,
            collaborators: [creator2.uid],
            updated: now,
            name: `${creator.username}/Secret`,
            description: '',
            // A padlock, matching this character's private visibility. Drawn in
            // currentColor so it stays legible in both light and dark themes.
            shapes: [
                {
                    type: 'path',
                    closed: false,
                    stroke: { color: null, width: 2 },
                    points: [
                        { x: 12, y: 15 },
                        { x: 12, y: 11 },
                        { x: 13, y: 9 },
                        { x: 16, y: 8 },
                        { x: 19, y: 9 },
                        { x: 20, y: 11 },
                        { x: 20, y: 15 },
                    ],
                },
                {
                    type: 'rect',
                    point: { x: 8, y: 15 },
                    width: 16,
                    height: 13,
                    corner: 2,
                    fill: null,
                },
            ],
        },
        {
            id: seedUUID(3),
            owner: creator.uid,
            public: true,
            collaborators: [],
            updated: now,
            name: `${creator.username}/Heart`,
            description: '',
            // Two round lobes over a triangle. Ellipse `point` is the top left
            // of the bounding box, not the center (see ellipseToSVG).
            shapes: [
                {
                    type: 'ellipse',
                    point: { x: 6, y: 7 },
                    width: 10,
                    height: 10,
                    fill: { l: 0.55, c: 100, h: 25 },
                },
                {
                    type: 'ellipse',
                    point: { x: 16, y: 7 },
                    width: 10,
                    height: 10,
                    fill: { l: 0.55, c: 100, h: 25 },
                },
                {
                    type: 'path',
                    closed: true,
                    fill: { l: 0.55, c: 100, h: 25 },
                    points: [
                        { x: 6, y: 12 },
                        { x: 26, y: 12 },
                        { x: 16, y: 28 },
                    ],
                },
            ],
        },
    ];
    const batch = firestore.batch();
    for (const c of characters)
        batch.set(firestore.collection('characters').doc(c.id), c);
    await batch.commit();
    console.log(
        `[seed] Wrote ${characters.length} characters owned by "${creator.username}"`,
    );
}

/** Seed chats: a project chat with a reported (under-moderation) message on a
 *  gallery project `creator` curates (so the curator moderation queue has an
 *  item), a project chat with an unread message (unread badge), and a how-to
 *  chat. Chat doc id == the project/how-to id (see getChat/getChatHowTo). */
async function seedChats(): Promise<void> {
    const firestore = getFirestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    const creator2 = SEEDED_USERS.find((u) => u.username === 'creator2');
    if (!creator || !creator2) throw new Error('creator/creator2 missing');
    const now = Date.now();
    const batch = firestore.batch();

    // Chat on a public gallery project creator curates → moderation queue item.
    batch.set(firestore.collection('chats').doc('seed-project-00'), {
        v: 2,
        type: 'project',
        project: 'seed-project-00',
        participants: [creator.uid, creator2.uid],
        messages: [
            {
                id: 'seed-msg-00a',
                time: now - 60000,
                creator: creator2.uid,
                text: 'Nice project!',
            },
            {
                id: 'seed-msg-00b',
                time: now - 10000,
                creator: creator2.uid,
                text: 'Reported test message.',
                moderation: 'pending',
                reporter: creator.uid,
            },
        ],
        unread: [],
    });

    // Chat on the collaborative project with an unread message for creator.
    batch.set(firestore.collection('chats').doc(SEEDED_COLLAB_PROJECT_ID), {
        v: 2,
        type: 'project',
        project: SEEDED_COLLAB_PROJECT_ID,
        participants: [creator.uid, creator2.uid],
        messages: [
            {
                id: 'seed-msg-01',
                time: now - 30000,
                creator: creator2.uid,
                text: 'Added a phrase — take a look!',
            },
        ],
        unread: [creator.uid],
    });

    // A how-to chat on a seeded published how-to.
    batch.set(firestore.collection('chats').doc('seed-howto-01'), {
        v: 2,
        type: 'howto',
        project: 'seed-howto-01',
        participants: [creator.uid],
        messages: [
            {
                id: 'seed-howto-msg-01',
                time: now - 20000,
                creator: creator.uid,
                text: 'Great how-to!',
            },
        ],
        unread: [],
    });

    await batch.commit();
    console.log(
        '[seed] Wrote project + how-to chats (incl. a reported message for moderation)',
    );
}

/** Seed how-tos authored by OTHER users (creator2, student1) inside the
 *  teacher's class gallery, published so gallery curators can read them, and
 *  link them into the class gallery's `howTos`. Exercises the gallery how-to
 *  listener seeing content the viewing user didn't author. */
async function seedOtherUserHowTos(): Promise<void> {
    const firestore = getFirestore();
    const creator2 = SEEDED_USERS.find((u) => u.username === 'creator2');
    const student1 = SEEDED_USERS.find((u) => u.username === 'student1');
    if (!creator2 || !student1) throw new Error('creator2/student1 missing');
    const now = Date.now();
    const authors = [creator2, student1, creator2];
    const ids = authors.map(
        (_, i) => `seed-otheruser-howto-${String(i).padStart(2, '0')}`,
    );

    const batch = firestore.batch();
    ids.forEach((id, i) => {
        batch.set(firestore.collection('howtos').doc(id), {
            v: 2,
            id,
            galleryId: SEEDED_CLASS_GALLERY_ID,
            published: true,
            publishedAt: now - i * 60_000,
            xcoord: i * 250,
            ycoord: 0,
            title: `¶How-to by ${authors[i].username} #${i + 1}¶/en-US`,
            guidingQuestions: HOWTO_GUIDING_QUESTIONS,
            text: [
                `¶Seeded how-to authored by ${authors[i].username}.\n\n\\Phrase("hi")\\¶/en-US`,
            ],
            creator: authors[i].uid,
            collaborators: [],
            viewers: {},
            viewersFlat: [],
            scopeOverwrite: false,
            locales: ['en-US'],
            isPublic: false,
            social: {
                v: 1,
                notifySubscribers: true,
                reactionOptions: HOWTO_REACTIONS,
                reactions: Object.fromEntries(
                    Object.keys(HOWTO_REACTIONS).map((e) => [e, []]),
                ),
                usedByProjects: [],
                chat: null,
                bookmarkers: [],
                submittedToGuide: false,
                seenByUsers: [authors[i].uid],
                viewCount: 0,
            },
        });
    });
    // Link them into the class gallery so the teacher's gallery how-to listener finds them.
    batch.set(
        firestore.collection('galleries').doc(SEEDED_CLASS_GALLERY_ID),
        { howTos: ids },
        { merge: true },
    );
    await batch.commit();
    console.log(
        `[seed] Wrote ${ids.length} how-tos authored by other users in the class gallery`,
    );
}

/** Seed a gallery curated by `teacher` with how-to expanded visibility on and
 *  `creator` listed as a viewer, plus a published how-to in it — so `creator`
 *  gets read-only expanded-scope access (the expandedScopeGalleries path). */
async function seedExpandedScopeGallery(): Promise<void> {
    const firestore = getFirestore();
    const teacher = SEEDED_USERS.find((u) => u.username === 'teacher');
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    if (!teacher || !creator) throw new Error('teacher/creator missing');
    const now = Date.now();
    const howToId = 'seed-expanded-howto-00';

    const galleryDoc = Gallery.make(
        SEEDED_EXPANDED_GALLERY_ID,
        { 'en-US': 'Expanded Scope Gallery' },
        {
            'en-US':
                'Teacher gallery whose how-tos are visible to creator via expanded scope.',
        },
        [teacher.uid], // curators
        [teacher.uid], // creators
        {
            howTos: [howToId],
            howToExpandedVisibility: true,
            howToViewers: { [SEEDED_EXPANDED_GALLERY_ID]: [creator.uid] },
            howToViewersFlat: [creator.uid],
        },
    ).data;
    await firestore
        .collection('galleries')
        .doc(SEEDED_EXPANDED_GALLERY_ID)
        .set(galleryDoc);

    await firestore
        .collection('howtos')
        .doc(howToId)
        .set({
            v: 2,
            id: howToId,
            galleryId: SEEDED_EXPANDED_GALLERY_ID,
            published: true,
            publishedAt: now,
            xcoord: 0,
            ycoord: 0,
            title: '¶Expanded-scope how-to¶/en-US',
            guidingQuestions: HOWTO_GUIDING_QUESTIONS,
            text: ['¶Visible to creator via expanded scope.¶/en-US'],
            creator: teacher.uid,
            collaborators: [],
            viewers: {},
            viewersFlat: [],
            scopeOverwrite: false,
            locales: ['en-US'],
            isPublic: false,
            social: {
                v: 1,
                notifySubscribers: true,
                reactionOptions: HOWTO_REACTIONS,
                reactions: Object.fromEntries(
                    Object.keys(HOWTO_REACTIONS).map((e) => [e, []]),
                ),
                usedByProjects: [],
                chat: null,
                bookmarkers: [],
                submittedToGuide: false,
                seenByUsers: [teacher.uid],
                viewCount: 0,
            },
        });
    console.log(
        `[seed] Wrote expanded-scope gallery "${SEEDED_EXPANDED_GALLERY_ID}" (creator has read-only how-to access)`,
    );
}

async function main(): Promise<void> {
    // Throws if the auth emulator never comes up; we let it propagate so the
    // run fails loudly instead of seeding nothing and running tests on empty.
    await seedUsers();
    try {
        await seedClassAndGallery();
    } catch (err) {
        console.error('[seed] Failed to seed class/gallery:', err);
    }
    try {
        await seedPublicProjectsAndGalleries();
    } catch (err) {
        console.error('[seed] Failed to seed public projects/galleries:', err);
    }
    try {
        await seedCollaborativeProject();
    } catch (err) {
        console.error('[seed] Failed to seed collaborative project:', err);
    }
    try {
        await seedCreatorHowTos();
    } catch (err) {
        console.error('[seed] Failed to seed creator how-tos:', err);
    }
    try {
        await seedOtherUserHowTos();
    } catch (err) {
        console.error('[seed] Failed to seed other-user how-tos:', err);
    }
    try {
        await seedExpandedScopeGallery();
    } catch (err) {
        console.error('[seed] Failed to seed expanded-scope gallery:', err);
    }
    try {
        await seedCharacters();
    } catch (err) {
        console.error('[seed] Failed to seed characters:', err);
    }
    try {
        await seedChats();
    } catch (err) {
        console.error('[seed] Failed to seed chats:', err);
    }
    console.log('[seed] Done. Manual logins:');
    for (const user of SEEDED_USERS) {
        const claimsNote = user.claims
            ? ` (${Object.keys(user.claims).join(', ')})`
            : '';
        console.log(`  - ${user.username} / ${PASSWORD}${claimsNote}`);
    }
    console.log(
        `[seed] Collaborative project: /project/${SEEDED_COLLAB_PROJECT_ID} (open in two browsers signed in as creator + creator2)`,
    );
    console.log(
        `[seed] Creator how-tos: /gallery/${SEEDED_HOWTO_GALLERY_ID}/howto (sign in as creator)`,
    );
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
