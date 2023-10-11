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
import { getAnalytics, type Analytics } from 'firebase/analytics';

let auth: Auth | undefined = undefined;
let firestore: Firestore | undefined = undefined;
let functions: Functions | undefined = undefined;
let analytics: Analytics | undefined = undefined;
// Don't connect to firebase when running in node.
if (typeof process === 'undefined') {
    try {
        if (PUBLIC_FIREBASE_API_KEY.length > 0) {
            const firebaseConfig = {
                apiKey: PUBLIC_FIREBASE_API_KEY,
                authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: PUBLIC_FIREBASE_PROJECT_ID,
                messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: PUBLIC_FIREBASE_APP_ID,
                measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID,
            };

            // Initialize Firebase
            const app =
                getApps().length === 0
                    ? initializeApp(firebaseConfig)
                    : getApp();

            auth = getAuth(app);
            firestore = getFirestore(app);
            functions = getFunctions(app);
            analytics = getAnalytics(app);

            // Initialize emulator if environment is local.
            if (PUBLIC_CONTEXT === 'local') {
                connectFirestoreEmulator(firestore, 'localhost', 8080);
                connectAuthEmulator(auth, 'http://localhost:9099');
                connectFunctionsEmulator(functions, 'localhost', 5001);
            }
        }
    } catch (err) {
        console.log('*** NO ACCESS TO FIREBASE ***');
        console.log(err);
    }
}

export { auth };
export { firestore };
export { functions };
export { analytics };
