import { PromisePool } from '@supercharge/promise-pool';
import { getFirestore } from 'firebase-admin/firestore';

const PurgeDayDelay = 30;
const MillisecondsPerDay = 24 * 60 * 60 * 1000;

export default async function purgeArchivedProjects(): Promise<void> {
    const db = getFirestore();
    const projectsRef = db.collection('projects');
    const purgeable = await projectsRef
        .where('archived', '==', true)
        .where(
            'timestamp',
            '<',
            Date.now() - PurgeDayDelay * MillisecondsPerDay,
        )
        .get();

    const projectIDs: string[] = [];
    purgeable.forEach((doc) => projectIDs.push(doc.id));

    // Don't delete all at once; we'll hit a request limit on large purges.
    await PromisePool.for(projectIDs)
        .withConcurrency(3)
        .process(async (id) => {
            projectsRef.doc(id).delete();
        });
}
