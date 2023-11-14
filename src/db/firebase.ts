import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
    Firestore,
    connectFirestoreEmulator,
    getFirestore,
} from 'firebase/firestore';
import {
    PUBLIC_CONTEXT,
    PUBLIC_FIREBASE_API_KEY,
    PUBLIC_FIREBASE_AUTH_DOMAIN,
    PUBLIC_FIREBASE_PROJECT_ID,
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    PUBLIC_FIREBASE_APP_ID,
    PUBLIC_FIREBASE_MEASUREMENT_ID,
} from '$env/static/public';
import {
    connectFunctionsEmulator,
    getFunctions,
    type Functions,
} from 'firebase/functions';
import { getAnalytics, type Analytics, setConsent } from 'firebase/analytics';

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

        firestore = getFirestore(app);
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
            connectAuthEmulator(auth, 'http://localhost:9099');
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }
    } catch (err) {
        console.error('*** NO ACCESS TO FIREBASE ***');
        console.error(err);
    }
}

export { auth };
export { firestore };
export { functions };
export { analytics };
