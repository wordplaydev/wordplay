import {
    PUBLIC_CONTEXT,
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_MEASUREMENT_ID,
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    PUBLIC_FIREBASE_PROJECT_ID,
} from '$env/static/public';
// Type-only: the analytics, auth, and functions SDKs are all loaded lazily off
// the critical path (see initAnalytics / ensureAuth / getFunctionsInstance
// below), so none of them enters the eager firebase chunk. Only firebase/app +
// firebase/firestore stay eager, since a shared project link needs Firestore to
// display (ProjectsDatabase.get falls through to a getDoc).
import type { Analytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import deferToIdle from '@util/deferToIdle';
import type { Auth } from 'firebase/auth';
import {
    connectFirestoreEmulator,
    initializeFirestore,
    type Firestore,
} from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

/** The initialized app + whether we're pointing at emulators. Set at module
 *  eval (below) and read by the lazy accessors. Undefined only when Firebase
 *  couldn't initialize (or in node). */
let app: FirebaseApp | undefined = undefined;
let emulating = false;

let auth: Auth | undefined = undefined;
let firestore: Firestore | undefined = undefined;
let functions: Functions | undefined = undefined;
let analytics: Analytics | undefined = undefined;

// Memoized in-flight loads so concurrent callers share one SDK download/init.
let authPromise: Promise<Auth | undefined> | undefined;
let functionsPromise: Promise<Functions | undefined> | undefined;

/** Load the analytics SDK on demand, deny tracking consent, then initialize it.
 *  Kept out of module-eval so neither the SDK bytes nor getAnalytics's work sit
 *  on the critical path. Consent is denied before getAnalytics starts collecting. */
async function initAnalytics(app: FirebaseApp) {
    const { getAnalytics, setConsent } = await import('firebase/analytics');
    // Deny consent for analytics, ad tracking, and personalization tracking.
    setConsent({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        personalization_storage: 'denied',
    });
    analytics = getAnalytics(app);
}

/** Lazily load firebase/auth and initialize Auth. Auth is never needed to
 *  display a project (public reads are unauthenticated), so its SDK stays out of
 *  the eager chunk and loads on first use — the first is DB.login() from the
 *  layout's onMount. Memoized; also wires the emulator + dev auto-login (moved
 *  here from module-eval so they still run, but only once auth actually loads). */
export function ensureAuth(): Promise<Auth | undefined> {
    if (auth !== undefined) return Promise.resolve(auth);
    if (app === undefined) return Promise.resolve(undefined);
    if (authPromise === undefined) authPromise = loadAuth(app);
    return authPromise;
}

async function loadAuth(app: FirebaseApp): Promise<Auth | undefined> {
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');
    const instance = getAuth(app);

    if (emulating) {
        connectAuthEmulator(instance, 'http://localhost:9099', {
            disableWarnings: true,
        });

        // Dev convenience: auto-login as the seeded `creator` account on first
        // load if no user is cached. Gated on `import.meta.hot` so it runs ONLY
        // under `vite dev`, not the production/preview build the e2e suite
        // serves — `emulating` alone is also true in e2e, where this would race
        // every loginNewContext() call and break the multi-user specs.
        if (import.meta.hot) {
            const { onAuthStateChanged, signInWithEmailAndPassword } =
                await import('firebase/auth');
            const stopAutoLogin = onAuthStateChanged(instance, (user) => {
                stopAutoLogin();
                if (user === null) {
                    signInWithEmailAndPassword(
                        instance,
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

    auth = instance;
    return instance;
}

/** Lazily load firebase/functions and initialize Functions. Cloud Functions are
 *  only invoked on user action (translate, getCreators, create class, …), never
 *  at startup, so the SDK loads on first call. Memoized; wires the emulator. */
export function getFunctionsInstance(): Promise<Functions | undefined> {
    if (functions !== undefined) return Promise.resolve(functions);
    if (app === undefined) return Promise.resolve(undefined);
    if (functionsPromise === undefined) functionsPromise = loadFunctions(app);
    return functionsPromise;
}

async function loadFunctions(app: FirebaseApp): Promise<Functions | undefined> {
    const { getFunctions, connectFunctionsEmulator } =
        await import('firebase/functions');
    const instance = getFunctions(app);
    if (emulating) connectFunctionsEmulator(instance, 'localhost', 5001);
    functions = instance;
    return instance;
}

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
        app = uninitialized ? initializeApp(firebaseConfig) : getApp();

        emulating = PUBLIC_CONTEXT === 'local';

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

        // Point Firestore at the emulator when local. Auth + Functions emulator
        // wiring lives in their lazy loaders (loadAuth/loadFunctions), so it
        // runs when those SDKs load rather than here at module eval.
        if (emulating) connectFirestoreEmulator(firestore, 'localhost', 8080);

        // Defer analytics init off the critical path (skipped when emulating).
        const initializedApp = app;
        if (!emulating) deferToIdle(() => void initAnalytics(initializedApp));
    } catch (err) {
        console.error('*** NO ACCESS TO FIREBASE ***');
        console.error(err);
    }
}

export { analytics, auth, firestore, functions };
