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
            // There are some network proxies and anti-virus software that require long polling to correctly
            // transmit data. This slows down the entire persistence layer, but may be necessary for some school settings.
            // See https://github.com/firebase/firebase-js-sdk/issues/1674
            experimentalForceLongPolling: true,
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
            // step every time the dev server reloads. Only runs against the
            // emulator (gated by `emulating`), never in production.
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
    } catch (err) {
        console.error('*** NO ACCESS TO FIREBASE ***');
        console.error(err);
    }
}

export { analytics, auth, firestore, functions };
