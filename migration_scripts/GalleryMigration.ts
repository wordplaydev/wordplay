
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Script to migrate gallery from V1 to V2
 * GalleryV2 adds a number of new fields related to how-tos, and we need to be able to
 * query against howToViewersFlat in a real-time query to show all of the how-tos a user
 * has access to.
 * This script will read all galleries from the database, upgrade them to V2 if they are
 * still in V1, and write them back to the database.
 */


initializeApp();
const db = getFirestore();

let query = db.collection('galleries').where("v", "==", 1);
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
        })
    });

    batch.commit();
});
