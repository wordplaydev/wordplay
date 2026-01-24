
import { initializeApp } from 'firebase-admin/app';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';

/**
 * Script to migrate all projects to V5
 * ProjectV4 adds three new fields that enable commenters and viewers to be added to projects
 * We need to be able to query against commenters and viewers to be able to know if the user
 * can access the project under one of these new roles.
 * This script will read all of the projects from the database, upgrade them all the way up to V5,
 * and write them back to the database.
 */


initializeApp();
const db = getFirestore();


let query = db.collection('projects').where("v", "!=", 5);
let batch = db.batch();

function upgradeHelper(project: DocumentData): DocumentData {
    switch (project.v) {
        case 1:
            return upgradeHelper({ ...project, v: 2, nonPII: [] });
        case 2:
            return upgradeHelper({ ...project, v: 3, chat: null });
        case 3:
            return upgradeHelper({ ...project, v: 4, history: [] });
        case 4:
            return upgradeHelper({ ...project, v: 5, restrictedGallery: false, viewers: [], commenters: [] });
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