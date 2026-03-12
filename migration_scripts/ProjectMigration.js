import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

/**
 * Script to migrate all projects to V5
 * ProjectV4 adds three new fields that enable commenters and viewers to be added to projects
 * We need to be able to query against commenters and viewers to be able to know if the user
 * can access the project under one of these new roles.
 * This script will read all of the projects from the database, upgrade them all the way up to V5,
 * and write them back to the database.
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

let query = db.collection('projects').where('v', '!=', 5);
let batch = db.batch();

function upgradeHelper(project) {
    switch (project.v) {
        case 1:
            return upgradeHelper({ ...project, v: 2, nonPII: [] });
        case 2:
            return upgradeHelper({ ...project, v: 3, chat: null });
        case 3:
            return upgradeHelper({ ...project, v: 4, history: [] });
        case 4:
            return upgradeHelper({
                ...project,
                v: 5,
                restrictedGallery: false,
                viewers: [],
                commenters: [],
            });
        case 5:
            return project;
        default:
            throw new Error('Unexpected project version ' + project);
    }
}

query.get().then(async (snapshot) => {
    let docs = snapshot.docs;

    docs.forEach((doc) => {
        let data = doc.data();
        let upgraded = upgradeHelper(data);
        batch.set(doc.ref, upgraded);
    });

    batch.commit();
});
