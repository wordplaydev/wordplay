import type { Page } from '@playwright/test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;

/**
 * Returns the Firestore instance used for testing.
 */
export function getTestFirestore(): Firestore {
    if (firestoreInstance) {
        return firestoreInstance;
    }

    const testApp = initializeApp({
        projectId: 'demo-wordplay',
    });

    firestoreInstance = getFirestore(testApp);

    // Connect to the Firestore emulator
    firestoreInstance.settings({
        host: 'localhost:8080',
        ssl: false,
    });

    return firestoreInstance;
}

/**
 * Fetches a specific document from the test Firestore database.
 */
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

/**
 * Updates a project's source code in Firestore directly.
 * Useful for setting up test scenarios without going through the UI.
 */
export async function updateProjectSource(
    projectId: string,
    sourceCode: string,
): Promise<void> {
    const firestore = getTestFirestore();
    const projectRef = firestore.collection('projects').doc(projectId);

    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
        throw new Error(`Project ${projectId} not found in Firestore`);
    }

    const projectData = projectSnap.data();

    if (projectData?.sources && Array.isArray(projectData.sources) && projectData.sources.length > 0) {
        projectData.sources[0].code = sourceCode;

        await projectRef.update({
            sources: projectData.sources,
            timestamp: Date.now(),
        });
    } else {
        throw new Error(`Could not update project source: project ${projectId} has missing or invalid sources field`);
    }
}

/**
 * Waits for a document in Firestore to meet a specific condition.
 * Useful when waiting for updates to be saved to the cloud.
 *
 * @param page - The Playwright page (needed for waitForTimeout)
 * @param collectionName - The collection name
 * @param documentId - The document ID
 * @param predicate - A function that takes the document data and returns true when the condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 15000 — cloud
 *                  writes are debounced and emulator round-trip latency varies,
 *                  so anything tighter is the leading source of test flake)
 * @param interval - Polling interval in milliseconds (default: 100)
 * @returns The document data when the condition is met, or after the check has timed out
 */
export async function waitForDocumentUpdate(
    page: Page,
    collectionName: string,
    documentId: string,
    predicate: (data: FirebaseFirestore.DocumentData | null | undefined) => boolean,
    timeout = 15000,
    interval = 100,
) {
    let documentData;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        documentData = await getTestDocument(collectionName, documentId);
        if (documentData && predicate(documentData)) {
            break;
        }
        await page.waitForTimeout(interval);
    }

    return documentData;
}

/**
 * Waits until the client's local Dexie cache (`wordplay` DB, `projects` store)
 * holds the given project — optionally with a source substring. This is the
 * reliable signal that the project is in the in-memory `allEditableProjects`
 * store that the client-side character-rename rewrite iterates: on page load
 * `ProjectsDatabase.trackLocal` rehydrates cached projects into memory
 * independent of realtime-listener timing. Reads via `getAll()` and matches on
 * the serialized `id` field to avoid coupling to the store's `++id` key.
 */
export async function waitForClientCachedProject(
    page: Page,
    projectId: string,
    sourceContains?: string,
    timeout = 20000,
): Promise<void> {
    await page.waitForFunction(
        ({ id, needle }) =>
            new Promise<boolean>((resolve) => {
                const request = indexedDB.open('wordplay');
                request.onsuccess = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains('projects')) {
                        db.close();
                        resolve(false);
                        return;
                    }
                    const getAll = db
                        .transaction('projects', 'readonly')
                        .objectStore('projects')
                        .getAll();
                    getAll.onsuccess = () => {
                        const rows: Array<{
                            id?: string;
                            sources?: Array<{ code?: string }>;
                        }> = getAll.result;
                        db.close();
                        resolve(
                            rows.some(
                                (p) =>
                                    p?.id === id &&
                                    (needle === undefined ||
                                        (p?.sources?.[0]?.code ?? '').includes(
                                            needle,
                                        )),
                            ),
                        );
                    };
                    getAll.onerror = () => {
                        db.close();
                        resolve(false);
                    };
                };
                request.onerror = () => resolve(false);
            }),
        { id: projectId, needle: sourceContains },
        { timeout, polling: 300 },
    );
}
