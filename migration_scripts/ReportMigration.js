// The modular entry points, not the default `firebase-admin` export: under ESM
// that export has no `credential`, so `admin.credential.cert(...)` throws
// before the script reaches a single document.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

/**
 * Migrate reports from the #193 shape to the #938 one.
 *
 * v1 reports were only ever about projects and only ever read by platform
 * moderators, so they carry `{ project, reporter, time, resolved }` and nothing
 * that says who may review them. v2 generalizes the collection to every kind of
 * content and routes reads by two denormalized fields, so a v1 document is
 * invisible to both new queues until it is rewritten:
 *
 *   { v: 2, kind: 'project', subject, gallery, moderators, platform: true,
 *     author, reporters: [...], time, resolved }
 *
 * Two things this does beyond renaming fields. It collapses duplicates onto the
 * deterministic document id the `report` callable now uses — `addDoc` minted a
 * random one per press, so the same project reported twice made two documents
 * and a moderator saw it twice — keeping the earliest `time` and unioning the
 * reporters. And it fills `author` from the project's owner, so a decision can
 * address the person it is about.
 *
 * `platform` is true for every migrated report: v1 reporting was only offered
 * on public projects, which is exactly the platform's own responsibility.
 *
 * Run this BEFORE deploying the new rules. A v1 document is not exposed by the
 * new read rule (it has neither `platform` nor `moderators`), so the failure
 * mode of running late is a report nobody sees, not a report the wrong person
 * sees — but it is still an open request for review going unanswered.
 *
 * Usage: node ReportMigration.js dev|prod
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

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

/** Mirrors functions/src/reportId.ts. */
function reportId(kind, subject) {
    return `${kind}:${subject}`;
}

const snapshot = await db.collection('reports').get();

// Group by the id each will land on, so duplicates merge rather than race.
const merged = new Map();
const stale = [];
for (const doc of snapshot.docs) {
    const data = doc.data();
    // Already migrated.
    if (data.v === 2) continue;
    const subject = data.project;
    if (typeof subject !== 'string' || subject.length === 0) {
        console.log(`Skipping ${doc.id}: no project.`);
        continue;
    }
    const id = reportId('project', subject);
    const existing = merged.get(id) ?? {
        subject,
        reporters: new Set(),
        time: Number.POSITIVE_INFINITY,
        resolved: true,
    };
    if (typeof data.reporter === 'string')
        existing.reporters.add(data.reporter);
    if (typeof data.time === 'number')
        existing.time = Math.min(existing.time, data.time);
    // A group is unresolved if any of its reports still is.
    if (data.resolved !== true) existing.resolved = false;
    merged.set(id, existing);
    // The old random-id document goes away once its content has a home.
    if (doc.id !== id) stale.push(doc.ref);
}

console.log(
    `${snapshot.size} report(s) read; writing ${merged.size}; removing ${stale.length} duplicate/renamed document(s).`,
);

// Look up each project's owner and gallery in one pass.
const subjects = [...new Set([...merged.values()].map((m) => m.subject))];
const owners = new Map();
for (let i = 0; i < subjects.length; i += 100) {
    const chunk = subjects.slice(i, i + 100);
    const docs = await db.getAll(
        ...chunk.map((id) => db.collection('projects').doc(id)),
    );
    for (const doc of docs)
        owners.set(doc.id, {
            author: doc.get('owner') ?? null,
            gallery: doc.get('gallery') ?? null,
        });
}

// Firestore caps a batch at 500 operations.
const LIMIT = 450;
let batch = db.batch();
let pending = 0;
async function flush() {
    if (pending > 0) await batch.commit();
    batch = db.batch();
    pending = 0;
}

for (const [id, m] of merged) {
    const about = owners.get(m.subject) ?? { author: null, gallery: null };
    batch.set(db.collection('reports').doc(id), {
        v: 2,
        kind: 'project',
        subject: m.subject,
        gallery: about.gallery,
        // Reporting was only ever offered on public projects, so every one of
        // these is the platform's. Curators review nothing retroactively.
        moderators: [],
        platform: true,
        author: about.author,
        reporters: [...m.reporters],
        time: Number.isFinite(m.time) ? m.time : Date.now(),
        resolved: m.resolved,
    });
    if (++pending >= LIMIT) await flush();
}
for (const ref of stale) {
    batch.delete(ref);
    if (++pending >= LIMIT) await flush();
}
await flush();

console.log('Done.');
