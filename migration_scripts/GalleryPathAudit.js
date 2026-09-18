import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

/**
 * Audit galleries that already hold a `path`, before vanity URLs ship (#180).
 *
 * Until this feature, `path` existed in the schema and was written as `null`
 * everywhere — but no security rule mentioned it, so a curator *could* have put
 * any value there. Once `path` becomes server-owned, a gallery holding a value
 * nobody reserved is a problem in two directions: it would start resolving at a
 * name the index does not hold (so someone else could claim it), and its
 * curator could never write the document again, because every client write
 * carries the field and the rule now requires it to be unchanged.
 *
 * Almost certainly zero rows. Run it anyway, before deploying the rules:
 *
 *     node migration_scripts/GalleryPathAudit.js dev
 *     node migration_scripts/GalleryPathAudit.js prod
 *
 * Read-only. It reports; it does not repair, because what to do with a hit
 * depends on whether the value is a name worth keeping (reserve it) or noise
 * (clear it), and there should be few enough to decide one at a time.
 */

const project = process.argv[2];
if (project !== 'dev' && project !== 'prod') {
    console.log(`Expected 'dev' or 'prod', but received ${project}`);
    process.exit();
}

const serviceKeyPath = `../wordplay-${project}-service-key.json`;
const serviceAccount = JSON.parse(readFileSync(serviceKeyPath, 'utf8'));
if (serviceAccount === undefined) {
    console.log(`Couldn't find service key at ${serviceKeyPath}`);
    process.exit();
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = getFirestore();

const galleries = await db.collection('galleries').get();
const held = galleries.docs.filter((doc) => {
    const path = doc.get('path');
    return path !== null && path !== undefined;
});

if (held.length === 0) {
    console.log(
        `No gallery holds a path. Safe to deploy the rules for ${project}.`,
    );
} else {
    console.log(
        `${held.length} gallery/galleries already hold a path in ${project}:`,
    );
    for (const doc of held)
        console.log(`  ${doc.id}: ${JSON.stringify(doc.get('path'))}`);
    console.log(
        '\nFor each: either write a matching gallerypaths/{folded} reservation,\n' +
            'or clear the field. Do it before the rules make `path` server-owned.',
    );
}

// Also report reservations with no gallery pointing back, which a half-applied
// claim would leave behind and nothing else would ever notice.
const reservations = await db.collection('gallerypaths').get();
const ids = new Set(galleries.docs.map((doc) => doc.id));
const orphans = reservations.docs.filter((doc) => {
    const gallery = doc.get('gallery');
    return typeof gallery === 'string' && !ids.has(gallery);
});
if (orphans.length > 0) {
    console.log(`\n${orphans.length} reservation(s) point at no gallery:`);
    for (const doc of orphans)
        console.log(`  ${doc.id} -> ${doc.get('gallery')}`);
    console.log(
        'These should be tombstones ({gallery: null, retiredAt}) — the delete\n' +
            'trigger writes that. A pointer to a missing gallery means one got away.',
    );
}

process.exit();
