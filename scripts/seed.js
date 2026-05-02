import admin from 'firebase-admin';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'demo-wordplay' });

async function seedAuth() {
    // Retry until the emulator is ready (it takes a few seconds to start).
    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            await admin.auth().createUser({
                uid: 'creator0000000000000000000001',
                email: 'creator@u.wordplay.dev',
                displayName: '⚒',
                password: 'password',
                emailVerified: true,
            });
            console.log('[seed] Created test user "creator"');
            return;
        } catch (err) {
            if (
                err.code === 'auth/uid-already-exists' ||
                err.code === 'auth/email-already-exists'
            ) {
                return; // already seeded
            }
            // Emulator not up yet — wait and retry
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
    console.error('[seed] Gave up waiting for auth emulator after 60s');
}

await seedAuth();
