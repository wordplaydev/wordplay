import {
    PUBLIC_CONTEXT,
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_MEASUREMENT_ID,
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_RECAPTCHA_SITE_KEY,
} from '$env/static/public';
// Type-only: the analytics, auth, and functions SDKs are all loaded lazily off
// the critical path (see initAnalytics / ensureAuth / getFunctionsInstance
// below), so none of them enters the eager firebase chunk. Only firebase/app +
// firebase/firestore stay eager, since a shared project link needs Firestore to
// display (ProjectsDatabase.get falls through to a getDoc).
import type { Analytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import deferToIdle from '@util/deferToIdle';
import lazyWithRetry from '@util/lazyWithRetry';
import type { Auth } from 'firebase/auth';
import {
    connectFirestoreEmulator,
    initializeFirestore,
    type Firestore,
} from 'firebase/firestore';
import type { AppCheck } from 'firebase/app-check';
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
let appCheck: AppCheck | undefined = undefined;

// Memoized in-flight loads so concurrent callers share one SDK download/init.
// lazyWithRetry clears the memo on rejection: a failed chunk fetch must not
// wedge auth/functions for the life of the tab (see lazyWithRetry).
let authLoader: (() => Promise<Auth | undefined>) | undefined;
let functionsLoader: (() => Promise<Functions | undefined>) | undefined;
let appCheckLoader: (() => Promise<AppCheck | undefined>) | undefined;

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

/**
 * Lazily attest that this is a real Wordplay client (#1299).
 *
 * App Check exchanges a reCAPTCHA assessment for a token that Firebase SDKs
 * attach to their requests, so a scripted caller holding the same public config
 * can't reach the endpoints that cost money — or mint accounts to multiply the
 * per-creator translation budget, which is what made the account itself worth
 * forging.
 *
 * **Deliberately not called at module eval, and not from ensureAuth.** An
 * assessment is created every time a browser refreshes its App Check token, and
 * `ensureAuth` runs on every page load for every visitor — including someone who
 * only opened a shared project link and never signs in. Calling it there would
 * make the bill scale with visitors rather than with actions. It is called from
 * `loadFunctions`, so every callable carries a token, and explicitly from the
 * handlers that write to Firebase Auth (see appCheckConvention.test.ts).
 *
 * `isTokenAutoRefreshEnabled` is off for the same reason: with it on, the SDK
 * refreshes at roughly half the token's lifetime whether or not the page does
 * anything, which at the default one-hour TTL is about two assessments per
 * browser-hour. Off, a token is minted when something actually needs one and
 * then reused until it expires. The TTL itself is a console setting, and is 7
 * days.
 *
 * Skipped when emulating: there is no App Check service behind the emulator, and
 * the debug provider still registers a token with Google's servers, which would
 * hang a CI runner with no outbound network and take out every e2e spec at once.
 * Skipped too when no site key is configured, which is how `.env.template` and
 * `.env.demo-wordplay` ship.
 */
export function ensureAppCheck(): Promise<AppCheck | undefined> {
    if (appCheck !== undefined) return Promise.resolve(appCheck);
    const initialized = app;
    if (initialized === undefined) return Promise.resolve(undefined);
    if (emulating || PUBLIC_RECAPTCHA_SITE_KEY === '')
        return Promise.resolve(undefined);
    if (appCheckLoader === undefined)
        appCheckLoader = lazyWithRetry(() => loadAppCheck(initialized));
    return appCheckLoader();
}

async function loadAppCheck(app: FirebaseApp): Promise<AppCheck | undefined> {
    // A dynamic import on purpose: firebase.ts is reachable from the layout, so
    // a static import would put the App Check SDK — and reCAPTCHA's own script —
    // into what every page downloads. importGraph.test.ts counts value imports
    // and would fail.
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
        await import('firebase/app-check');
    const instance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: false,
    });
    appCheck = instance;
    return instance;
}

/** Lazily load firebase/auth and initialize Auth. Auth is never needed to
 *  display a project (public reads are unauthenticated), so its SDK stays out of
 *  the eager chunk and loads on first use — the first is DB.login() from the
 *  layout's onMount. Memoized; also wires the emulator + dev auto-login (moved
 *  here from module-eval so they still run, but only once auth actually loads). */
export function ensureAuth(): Promise<Auth | undefined> {
    if (auth !== undefined) return Promise.resolve(auth);
    const initialized = app;
    if (initialized === undefined) return Promise.resolve(undefined);
    if (authLoader === undefined)
        authLoader = lazyWithRetry(() => loadAuth(initialized));
    return authLoader();
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
    const initialized = app;
    if (initialized === undefined) return Promise.resolve(undefined);
    if (functionsLoader === undefined)
        functionsLoader = lazyWithRetry(() => loadFunctions(initialized));
    return functionsLoader();
}

async function loadFunctions(app: FirebaseApp): Promise<Functions | undefined> {
    // Before the Functions SDK exists, so the first callable already carries a
    // token rather than being the one request that goes without.
    await ensureAppCheck();
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
