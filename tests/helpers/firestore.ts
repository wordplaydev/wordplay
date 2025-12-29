import { initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let testApp: App | null = null;
let firestoreInstance: Firestore | null = null;

export function getTestFirestore(): Firestore {
    if (firestoreInstance) {
        return firestoreInstance;
    }

    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

    testApp = initializeApp({
        projectId: 'demo',
    });

    firestoreInstance = getFirestore(testApp);
    return firestoreInstance;
}

export async function getTestDocument(
    collectionName: string,
    documentId: string,
) {
    const firestore = getTestFirestore();
    const docRef = firestore.collection(collectionName).doc(documentId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        return docSnap.data();
    }
    return null;
}

export async function listTestDocuments(collectionName: string) {
    const firestore = getTestFirestore();
    const snapshot = await firestore.collection(collectionName).get();

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
    }));
}
