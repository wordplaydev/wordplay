import {
    PUBLIC_CONTEXT,
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_MEASUREMENT_ID,
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    PUBLIC_FIREBASE_PROJECT_ID,
} from '$env/static/public';
import { getAnalytics, setConsent, type Analytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    connectAuthEmulator,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    type Auth,
} from 'firebase/auth';
import {
    connectFirestoreEmulator,
    initializeFirestore,
    type Firestore,
} from 'firebase/firestore';
import {
    connectFunctionsEmulator,
    getFunctions,
    type Functions,
} from 'firebase/functions';

let auth: Auth | undefined = undefined;
let firestore: Firestore | undefined = undefined;
let functions: Functions | undefined = undefined;
let analytics: Analytics | undefined = undefined;
// Don't connect to firebase when running in node.
if (typeof process === 'undefined') {
    try {
        const firebaseConfig = {
            apiKey: PUBLIC_FIREBASE_API_KEY,
            authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: PUBLIC_FIREBASE_PROJECT_ID,
            messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: PUBLIC_FIREBASE_APP_ID,
            measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID,
        };

        const uninitialized = getApps().length === 0;

        // Initialize Firebase
        const app = uninitialized ? initializeApp(firebaseConfig) : getApp();

        const emulating = PUBLIC_CONTEXT === 'local';

        auth = getAuth(app);

        firestore = initializeFirestore(app, {
            // Deliberately NO `localCache` option: Firestore keeps the default
            // in-memory cache only. Our own Dexie store (WordplayDexie) is the
            // durable local mirror of all Firebase data, so enabling Firestore's
            // persistentLocalCache would duplicate that store in a second
            // IndexedDB and add a competing offline write queue. Firestore's
            // in-memory queue still flushes queued writes on reconnect within a
            // session; cross-reload durability for projects comes from the Dexie
            // cache + the unsaved flag (see ProjectsDatabase / ARCHITECTURE.md).
            //
            // Auto-detect long polling instead of forcing it. Forcing long
            // polling cycles many discrete HTTP requests instead of one
            // streaming WebChannel connection, and under heavy concurrent load
            // that starves/churns the session — producing "Unknown SID" 400s
            // and a reconnect storm on large accounts. Auto-detect uses the
            // efficient streaming transport when the network allows and falls
            // back to long polling only when an intermediary (school proxy /
            // anti-virus) requires it. See
            // https://github.com/firebase/firebase-js-sdk/issues/1674
            //
            // NOTE: validate on a proxied/filtered (school) network before
            // relying on this — fall back to experimentalForceLongPolling if
            // auto-detection misbehaves there.
            experimentalAutoDetectLongPolling: true,
            //experimentalForceLongPolling: false,
        });
        // firestore = getFirestore(app);
        functions = getFunctions(app);
        analytics = emulating ? undefined : getAnalytics(app);

        // Deny consent for analytics, ad tracking, and personalization tracking.
        setConsent({
            analytics_storage: 'denied',
            ad_storage: 'denied',
            personalization_storage: 'denied',
        });

        // Initialize emulator if environment is local.
        if (emulating) {
            connectFirestoreEmulator(firestore, 'localhost', 8080);
            connectAuthEmulator(auth, 'http://localhost:9099', {
                disableWarnings: true,
            });
            connectFunctionsEmulator(functions, 'localhost', 5001);

            // Dev convenience: auto-login as the seeded `creator` account on
            // first page load if no user is cached. Saves the manual login
            // step every time the dev server reloads.
            //
            // Gated on `import.meta.hot` so it runs ONLY under `vite dev`, not
            // in the production/preview build the e2e suite serves — `emulating`
            // alone is also true in e2e, where this would race every
            // loginNewContext() call (signing in as creator) and break the
            // multi-user specs.
            if (import.meta.hot) {
                const stopAutoLogin = onAuthStateChanged(auth, (user) => {
                    stopAutoLogin();
                    if (user === null && auth !== undefined) {
                        signInWithEmailAndPassword(
                            auth,
                            'creator@u.wordplay.dev',
                            'password',
                        ).catch((err) => {
                            console.warn(
                                '[dev] Auto-login as creator failed:',
                                err,
                            );
                        });
                    }
                });
            }
        }
    } catch (err) {
        console.error('*** NO ACCESS TO FIREBASE ***');
        console.error(err);
    }
}

export { analytics, auth, firestore, functions };
