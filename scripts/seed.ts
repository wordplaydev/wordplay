import admin from 'firebase-admin';
import Gallery from '../src/db/galleries/Gallery';
import Project from '../src/db/projects/Project';
import DefaultLocale from '../src/locale/DefaultLocale';
import Source from '../src/nodes/Source';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({ projectId: 'demo-wordplay' });

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

/** Seeded user definitions. Keep UIDs short, descriptive, and stable. */
const SEEDED_USERS: SeededUser[] = [
    {
        uid: 'creator0000000000000000000001',
        username: 'creator',
        displayName: '⚒',
        claims: null,
    },
    {
        // Second creator for manual testing of collaborative editing
        // (#135). Paired with `creator` on SEEDED_COLLAB_PROJECT_ID below
        // so two emulator browser sessions can open the same project and
        // exercise the presence + CRDT flows.
        uid: 'creator0000000000000000000002',
        username: 'creator2',
        displayName: '✎',
        claims: null,
    },
    {
        uid: 'seeded-teacher-uid-00000000001',
        username: 'teacher',
        displayName: 'Teacher',
        claims: { teacher: true },
    },
    {
        uid: 'seeded-mod-uid-000000000000001',
        username: 'mod',
        displayName: 'Mod',
        claims: { mod: true },
    },
    {
        uid: 'seeded-student-uid-00000000001',
        username: 'student1',
        displayName: 'Student One',
        claims: null,
    },
    {
        uid: 'seeded-student-uid-00000000002',
        username: 'student2',
        displayName: 'Student Two',
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

/**
 * Names for creator-owned public projects, each paired 1:1 with a gallery
 * below. The number of entries determines how many projects + galleries the
 * scroll-testing seed produces.
 */
const PUBLIC_PROJECT_NAMES = [
    'Hello World',
    'Bouncing Ball',
    'Color Wheel',
    'Spinning Letters',
    'Rainfall',
    'Star Field',
    'Word Cloud',
    'Heartbeat',
    'Wave Motion',
    'Pixel Garden',
];

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

/** Wait for the auth emulator to come up, then create the seeded users. */
async function seedUsers(): Promise<boolean> {
    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            // Probe the emulator with the first user; if it succeeds (or that
            // user already exists) the emulator is up and we can seed the rest.
            const first = SEEDED_USERS[0];
            try {
                await admin.auth().createUser({
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
        } catch {
            await new Promise((r) => setTimeout(r, 1000));
            if (attempt === 59) {
                console.error('[seed] Auth emulator never came up');
                return false;
            }
        }
    }

    for (const user of SEEDED_USERS.slice(1)) {
        try {
            await admin.auth().createUser({
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
        }
    }

    // Set custom claims for users that need them. setCustomUserClaims is safe
    // to call repeatedly and overwrites prior claims, so it doesn't need an
    // existence check.
    for (const user of SEEDED_USERS) {
        if (user.claims) {
            await admin.auth().setCustomUserClaims(user.uid, user.claims);
            console.log(
                `[seed] Set claims on "${user.username}": ${JSON.stringify(user.claims)}`,
            );
        }
    }

    return true;
}

/** Seed a class document and a class-associated gallery. */
async function seedClassAndGallery(): Promise<void> {
    const firestore = admin.firestore();

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
    index: number,
    ownerUid: string,
    galleryId: string,
) {
    const id = `seed-project-${String(index).padStart(2, '0')}`;
    const name = PUBLIC_PROJECT_NAMES[index] ?? `Project ${index}`;
    // Use Project.make so the serialized shape always matches the
    // current schema — no risk of v5/v6/v7/v8 drift if the schema
    // bumps again later. Project.make defaults handle stamps, crdt,
    // history, viewers, commenters, flags, etc.
    return Project.make(
        id,
        name,
        new Source('start', `Phrase("${name}")`),
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
    projectId: string,
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
            projects: [projectId],
            public: true,
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
    const firestore = admin.firestore();
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

/**
 * Seed a batch of creator-owned public projects, each in its own public
 * gallery. Useful for manually exercising pages that scroll (project list,
 * gallery directory, back-to-top button).
 */
async function seedPublicProjectsAndGalleries(): Promise<void> {
    const firestore = admin.firestore();
    const creator = SEEDED_USERS.find((u) => u.username === 'creator');
    if (!creator) throw new Error('Creator user missing from SEEDED_USERS');

    const batch = firestore.batch();
    for (let i = 0; i < PUBLIC_PROJECT_NAMES.length; i++) {
        // One project per index, one gallery per index, linked 1:1.
        const projectId = `seed-project-${String(i).padStart(2, '0')}`;
        const gallery = makePublicGallery(i, creator.uid, projectId);
        const project = makePublicProject(i, creator.uid, gallery.id);
        batch.set(firestore.collection('projects').doc(project.id), project);
        batch.set(firestore.collection('galleries').doc(gallery.id), gallery);
    }
    await batch.commit();

    console.log(
        `[seed] Wrote ${PUBLIC_PROJECT_NAMES.length} public projects and ${PUBLIC_GALLERY_THEMES.length} public galleries owned by "${creator.username}"`,
    );
}

async function main(): Promise<void> {
    const ok = await seedUsers();
    if (!ok) return;
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
}

await main();
