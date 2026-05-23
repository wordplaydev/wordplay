import admin from 'firebase-admin';
import type { SerializedGallery } from '../src/db/galleries/Gallery';
import type { SerializedProject } from '../src/db/projects/ProjectSchemas';

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

    const galleryDoc: SerializedGallery = {
        v: 2,
        id: SEEDED_CLASS_GALLERY_ID,
        path: null,
        name: { 'en-US': 'Demo Class Gallery' },
        description: { 'en-US': 'Seeded gallery for the demo class.' },
        words: [],
        projects: [],
        curators: [teacher.uid],
        creators: students.map((s) => s.uid),
        public: false,
        featured: false,
        howTos: [],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: [],
        howToReactions: {},
    };

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
): SerializedProject {
    const id = `seed-project-${String(index).padStart(2, '0')}`;
    const name = PUBLIC_PROJECT_NAMES[index] ?? `Project ${index}`;
    return {
        v: 5,
        id,
        name,
        sources: [
            {
                names: 'start',
                code: `Phrase("${name}")`,
                caret: 0,
            },
        ],
        locales: ['en-US'],
        owner: ownerUid,
        collaborators: [],
        public: true,
        listed: true,
        archived: false,
        timestamp: Date.now() - index * 1000,
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
    };
}

function makePublicGallery(
    index: number,
    curatorUid: string,
    projectId: string,
): SerializedGallery {
    // Gallery.isBuiltIn() treats hyphen-free IDs as built-ins, so the ID must
    // contain a hyphen. Stable IDs keep the seed idempotent across reruns.
    const id = `seed-public-gallery-${String(index).padStart(2, '0')}`;
    const theme = PUBLIC_GALLERY_THEMES[index] ?? `Gallery ${index}`;
    return {
        v: 2,
        id,
        path: null,
        name: { 'en-US': theme },
        description: {
            'en-US': `A seeded public gallery for testing (#${index + 1}).`,
        },
        words: theme.toLowerCase().split(/\s+/),
        projects: [projectId],
        curators: [curatorUid],
        creators: [curatorUid],
        public: true,
        featured: false,
        howTos: [],
        howToExpandedVisibility: false,
        howToExpandedGalleries: [],
        howToViewers: {},
        howToViewersFlat: [],
        howToGuidingQuestions: [],
        howToReactions: {},
    };
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
    console.log('[seed] Done. Manual logins:');
    for (const user of SEEDED_USERS) {
        const claimsNote = user.claims
            ? ` (${Object.keys(user.claims).join(', ')})`
            : '';
        console.log(`  - ${user.username} / ${PASSWORD}${claimsNote}`);
    }
}

await main();
