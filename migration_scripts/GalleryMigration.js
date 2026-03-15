import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

/**
 * Script to migrate gallery from V1 to V2
 * GalleryV2 adds a number of new fields related to how-tos, and we need to be able to
 * query against howToViewersFlat in a real-time query to show all of the how-tos a user
 * has access to.
 * This script will read all galleries from the database, upgrade them to V2 if they are
 * still in V1, and write them back to the database.
 */

// Get the project, either "dev" or "prod"
const project = process.argv[2];
if (project !== 'dev' && project !== 'prod') {
    console.log(
        `Expected 'dev' or 'prod' after email, but received ${project}`,
    );
    process.exit();
}

const serviceKeyPath = `../firebase-${project}-service-key.json`;

// Log in with the secret service key generated in the Firebase service accounts console.
const serviceAccount = JSON.parse(
    readFileSync(`../wordplay-${project}-service-key.json`, 'utf8'),
);

if (serviceAccount === undefined) {
    console.log(`Couldn't find service key at ${serviceKeyPath}`);
    process.exit();
}

// Initialize the SDK with the service account.
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = getFirestore();

let query = db.collection('galleries').where('v', '==', 1);
let batch = db.batch();

query.get().then(async (snapshot) => {
    let docs = snapshot.docs;

    docs.forEach((doc) => {
        batch.update(doc.ref, {
            v: 2,
            howToExpandedVisibility: false,
            howTos: [],
            howToExpandedGalleries: [],
            howToViewers: {},
            howToViewersFlat: [],
            howToGuidingQuestions: [],
            howToReactions: {},
        });
    });

    batch.commit();
});
