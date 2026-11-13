/**
 * Restore projects to a gallery's `projects` list from the projects themselves.
 *
 * A gallery page lists only what its `projects` array names, but a project's
 * own `gallery` field is the source of truth for membership. A client whose
 * copy of a gallery had stopped receiving snapshots used to write that whole
 * array back on its next save, dropping every project added since. A class
 * gallery of 29 projects became 14 that way. The projects still said where
 * they belonged, so this puts them back.
 *
 * It only adds, with arrayUnion. Ids in the array whose project says otherwise
 * are reported and left alone, since removing one is a decision a curator makes.
 *
 *   npx tsx scripts/repair-gallery-projects.ts [dev|prod|emulator] <gallery id> [--write]
 *   npx tsx scripts/repair-gallery-projects.ts [dev|prod|emulator] --find <name text>
 *
 * Without --write it only reports.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const project = process.argv[2];
const write = process.argv.includes('--write');
const findIndex = process.argv.indexOf('--find');
const find = findIndex >= 0 ? process.argv[findIndex + 1] : undefined;
const galleryID = find === undefined ? process.argv[3] : undefined;

if (
    (project !== 'dev' && project !== 'prod' && project !== 'emulator') ||
    (find === undefined &&
        (galleryID === undefined || galleryID.startsWith('--')))
) {
    console.log(
        'usage: npx tsx scripts/repair-gallery-projects.ts [dev|prod|emulator] (<gallery id> [--write] | --find <name text>)',
    );
    process.exit(1);
}

if (project === 'emulator') {
    initializeApp({ projectId: 'demo-wordplay' });
} else {
    const keyPath = `wordplay-${project}-service-key.json`;
    let serviceAccount: object;
    try {
        serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    } catch (error) {
        console.log(`Couldn't read service key at ${keyPath}: ${error}`);
        process.exit(1);
    }
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

function nameOf(data: Record<string, unknown> | undefined): string {
    const name = data?.name;
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null)
        return Object.values(name)
            .filter((n) => typeof n === 'string')
            .join(' / ');
    return '(unnamed)';
}

function stringsOf(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : [];
}

if (find !== undefined) {
    const needle = find.toLowerCase();
    const galleries = await db.collection('galleries').get();
    for (const gallery of galleries.docs) {
        const name = nameOf(gallery.data());
        if (name.toLowerCase().includes(needle))
            console.log(
                `${gallery.id}  ${name}  (${stringsOf(gallery.data().projects).length} projects)`,
            );
    }
    process.exit(0);
}

if (galleryID === undefined) process.exit(1);

const galleryRef = db.collection('galleries').doc(galleryID);
const gallery = await galleryRef.get();
if (!gallery.exists) {
    console.log(`No gallery ${galleryID}.`);
    process.exit(1);
}
const listed = new Set(stringsOf(gallery.data()?.projects));
const members = await db
    .collection('projects')
    .where('gallery', '==', galleryID)
    .get();

console.log(`Gallery: ${nameOf(gallery.data())} (${galleryID})`);
console.log(`  listed in its projects array: ${listed.size}`);
console.log(`  projects whose gallery names it: ${members.size}`);

const missing = members.docs.filter((member) => !listed.has(member.id));
console.log(`\nMissing from the array (${missing.length}):`);
for (const member of missing)
    console.log(
        `  ${member.id}  ${nameOf(member.data())}  owner ${member.data().owner}${member.data().archived ? '  (archived)' : ''}`,
    );

const memberIDs = new Set(members.docs.map((member) => member.id));
const strays = [...listed].filter((id) => !memberIDs.has(id));
console.log(
    `\nListed, but the project names another gallery or is gone (${strays.length}, left alone):`,
);
for (const id of strays) {
    const stray = await db.collection('projects').doc(id).get();
    console.log(
        `  ${id}  ${stray.exists ? `${nameOf(stray.data())}, gallery ${stray.data()?.gallery}` : '(no document)'}`,
    );
}

if (missing.length === 0) {
    console.log('\nNothing to restore.');
} else if (!write) {
    console.log(`\nRe-run with --write to add the ${missing.length} missing.`);
} else {
    await galleryRef.update({
        projects: FieldValue.arrayUnion(...missing.map((member) => member.id)),
    });
    console.log(`\nAdded ${missing.length} to the gallery's projects.`);
}
