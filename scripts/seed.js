import admin from 'firebase-admin';

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
 *
 * Every step is idempotent: it tolerates "already exists" errors so the
 * script can be re-run alongside an existing emulator state without
 * destroying data.
 */

// Helper: every seeded password is the same so manual login is uniform.
const PASSWORD = 'password';

/** Seeded user definitions. Keep UIDs short, descriptive, and stable. */
const SEEDED_USERS = [
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

const isAlreadyExists = (err) =>
    err?.code === 'auth/uid-already-exists' ||
    err?.code === 'auth/email-already-exists';

/** Wait for the auth emulator to come up, then create the seeded users. */
async function seedUsers() {
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
async function seedClassAndGallery() {
    const firestore = admin.firestore();

    const teacher = SEEDED_USERS.find((u) => u.username === 'teacher');
    const students = SEEDED_USERS.filter((u) =>
        u.username.startsWith('student'),
    );

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

    const galleryDoc = {
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

async function main() {
    const ok = await seedUsers();
    if (!ok) return;
    try {
        await seedClassAndGallery();
    } catch (err) {
        console.error('[seed] Failed to seed class/gallery:', err);
    }
    console.log('[seed] Done. Manual logins:');
    for (const user of SEEDED_USERS) {
        const claimsNote = user.claims
            ? ` (${Object.keys(user.claims).join(', ')})`
            : '';
        console.log(
            `  - ${user.username} / ${PASSWORD}${claimsNote}`,
        );
    }
}

await main();
