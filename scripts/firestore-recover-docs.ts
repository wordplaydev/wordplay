/**
 * Surgical Firestore recovery: copy specific documents from a historical
 * SOURCE database (a scratch DB produced by `firestore-restore.sh restore-backup`
 * or `import`) into a live TARGET database, preserving document IDs.
 *
 * WHY THIS EXISTS: Firestore's native import reverts a whole collection group to
 * the snapshot — it cannot restore a single user or project without rolling back
 * everyone else. This script fills that gap: point it at a scratch copy of the
 * past and it re-writes only the affected documents into prod.
 *
 * It copies documents VERBATIM (the stored snapshot shape, including the
 * Cloud-Function-maintained flattened fields like `howToViewersFlat`/`viewersFlat`/
 * `words`, which are internally consistent within that snapshot). It never touches
 * the transient `updates/`/`presence/` subcollections — durable project state lives
 * in the parent doc's `crdt` field. With --reconcile-refs it re-adds membership
 * (project↔gallery, howto↔gallery) into surviving galleries via arrayUnion only —
 * it never removes anyone.
 *
 * SAFETY: defaults to --dry-run (prints a per-doc plan, writes nothing). Pass
 * --confirm to actually write. The only writes are set() (full overwrite of the
 * matched docs) and arrayUnion (additive membership) — never a delete.
 *
 * Auth: Application Default Credentials — run `gcloud auth application-default login`
 * first, with a principal holding Firestore read/write on both databases.
 *
 * Usage:
 *   npx tsx scripts/firestore-recover-docs.ts --source <scratch-db-id> \
 *     [--project wordplay-prod] [--target '(default)'] \
 *     ( --docs projects/<id>,galleries/<id>,...   \
 *     | --owner <uid>                              \
 *     | --gallery <id> )                           \
 *     [--reconcile-refs] [--confirm]
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import {
    FieldValue,
    getFirestore,
    type DocumentData,
    type Firestore,
} from 'firebase-admin/firestore';
import { Domain } from '../src/db/Domains';

type Args = {
    project: string;
    source: string;
    target: string;
    docs: string[]; // "collection/id" paths
    owner: string | null;
    gallery: string | null;
    reconcileRefs: boolean;
    confirm: boolean;
};

function parseArgs(argv: string[]): Args {
    const a: Args = {
        project: 'wordplay-prod',
        source: '',
        target: '(default)',
        docs: [],
        owner: null,
        gallery: null,
        reconcileRefs: false,
        confirm: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = () => {
            const v = argv[++i];
            if (v === undefined) die(`missing value for ${arg}`);
            return v;
        };
        switch (arg) {
            case '--project': a.project = next(); break;
            case '--source': a.source = next(); break;
            case '--target': a.target = next(); break;
            case '--docs': a.docs = next().split(',').map((s) => s.trim()).filter(Boolean); break;
            case '--owner': a.owner = next(); break;
            case '--gallery': a.gallery = next(); break;
            case '--reconcile-refs': a.reconcileRefs = true; break;
            case '--confirm': a.confirm = true; break;
            case '--help': case '-h': usage(); break;
            default: die(`unknown argument: ${arg}`);
        }
    }
    return a;
}

function die(msg: string): never {
    console.error(`error: ${msg}`);
    process.exit(1);
}

function usage(): never {
    console.error(
        `Copy specific docs from a scratch SOURCE database into a live TARGET.\n\n` +
        `  --source <db-id>            (required) historical scratch database to read from\n` +
        `  --project <id>             GCP project (default wordplay-prod)\n` +
        `  --target <db-id>           database to write into (default '(default)')\n` +
        `  Exactly one selector:\n` +
        `  --docs c/id,c/id,...       explicit collection/id document paths\n` +
        `  --owner <uid>              all projects + characters owned by <uid>\n` +
        `  --gallery <id>             a gallery + its projects, howtos, and their chats\n` +
        `  --reconcile-refs           re-add project/howto membership into surviving galleries\n` +
        `  --confirm                  perform writes (default is a dry run)\n`,
    );
    process.exit(1);
}

/** Resolve the set of source doc paths to copy, per the chosen selector. */
async function collectPaths(source: Firestore, a: Args): Promise<string[]> {
    const selectors = [a.docs.length > 0, a.owner !== null, a.gallery !== null].filter(Boolean);
    if (selectors.length !== 1)
        die('choose exactly one of --docs, --owner, --gallery');

    const paths = new Set<string>();

    if (a.docs.length > 0) {
        for (const p of a.docs) {
            if (!/^[^/]+\/[^/]+$/.test(p)) die(`--docs entries must be "collection/id", got "${p}"`);
            paths.add(p);
        }
    }

    if (a.owner !== null) {
        for (const col of [Domain.Projects, Domain.Characters]) {
            const snap = await source.collection(col).where('owner', '==', a.owner).get();
            snap.forEach((d) => paths.add(`${col}/${d.id}`));
        }
    }

    if (a.gallery !== null) {
        paths.add(`${Domain.Galleries}/${a.gallery}`);
        const projSnap = await source.collection(Domain.Projects).where('gallery', '==', a.gallery).get();
        projSnap.forEach((d) => paths.add(`${Domain.Projects}/${d.id}`));
        const howSnap = await source.collection(Domain.HowTos).where('galleryId', '==', a.gallery).get();
        howSnap.forEach((d) => paths.add(`${Domain.HowTos}/${d.id}`));
    }

    // Chats are keyed by their project/howto id — pull the chat for every
    // project/howto we're recovering so the conversation comes back with it.
    for (const p of [...paths]) {
        const [col, id] = p.split('/');
        if (col === Domain.Projects || col === Domain.HowTos) {
            const chat = await source.doc(`${Domain.Chats}/${id}`).get();
            if (chat.exists) paths.add(`${Domain.Chats}/${id}`);
        }
    }

    return [...paths].sort();
}

/** Top-level keys whose JSON differs between two docs (for the dry-run plan). */
function changedKeys(before: DocumentData | undefined, after: DocumentData): string[] {
    if (before === undefined) return [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

async function main() {
    const a = parseArgs(process.argv.slice(2));
    if (!a.source) die('--source <scratch-db-id> is required');
    if (a.source === '(default)') die('--source must be a scratch database, not (default)');

    const app = initializeApp({ projectId: a.project, credential: applicationDefault() });
    const source = getFirestore(app, a.source);
    const target = a.target === '(default)' ? getFirestore(app) : getFirestore(app, a.target);

    console.log(`Recover docs: ${a.project}  source='${a.source}' -> target='${a.target}'`);
    console.log(a.confirm ? '*** CONFIRM: writes WILL be performed ***' : '(dry run — no writes; pass --confirm to apply)');

    const paths = await collectPaths(source, a);
    if (paths.length === 0) die('no matching documents found in source');
    console.log(`Matched ${paths.length} document(s).\n`);

    // Load source + current target state, build the plan.
    type Plan = { path: string; data: DocumentData; action: 'CREATE' | 'OVERWRITE' | 'IDENTICAL'; changed: string[] };
    const plan: Plan[] = [];
    const galleryMembers = new Map<string, { projects: string[]; howTos: string[] }>();

    for (const path of paths) {
        const src = await source.doc(path).get();
        if (!src.exists) { console.warn(`  skip (missing in source): ${path}`); continue; }
        const data = src.data() as DocumentData;
        const cur = await target.doc(path).get();
        const before = cur.exists ? (cur.data() as DocumentData) : undefined;
        const changed = changedKeys(before, data);
        const action: Plan['action'] = before === undefined ? 'CREATE' : changed.length === 0 ? 'IDENTICAL' : 'OVERWRITE';
        plan.push({ path, data, action, changed });

        const [col, id] = path.split('/');
        if (a.reconcileRefs) {
            const g =
                col === Domain.Projects && typeof data.gallery === 'string' ? data.gallery :
                col === Domain.HowTos && typeof data.galleryId === 'string' ? data.galleryId : null;
            if (g) {
                const m = galleryMembers.get(g) ?? { projects: [], howTos: [] };
                if (col === Domain.Projects) m.projects.push(id); else m.howTos.push(id);
                galleryMembers.set(g, m);
            }
        }
    }

    for (const p of plan) {
        const detail = p.action === 'OVERWRITE' ? ` (fields differ: ${p.changed.join(', ')})` : '';
        console.log(`  ${p.action.padEnd(9)} ${p.path}${detail}`);
    }
    if (a.reconcileRefs && galleryMembers.size > 0) {
        console.log('\n  Reference reconciliation (arrayUnion into surviving galleries):');
        for (const [g, m] of galleryMembers)
            console.log(`    galleries/${g}: +projects[${m.projects.length}] +howTos[${m.howTos.length}]`);
    }

    if (!a.confirm) {
        console.log('\nDry run complete. Re-run with --confirm to apply.');
        return;
    }

    // Apply: batched set() (full overwrite) of matched docs, then additive
    // membership reconciliation. Firestore batches cap at 500 writes.
    let written = 0;
    for (let i = 0; i < plan.length; i += 400) {
        const batch = target.batch();
        for (const p of plan.slice(i, i + 400)) batch.set(target.doc(p.path), p.data);
        await batch.commit();
        written += Math.min(400, plan.length - i);
    }
    console.log(`\nWrote ${written} document(s).`);

    if (a.reconcileRefs) {
        for (const [g, m] of galleryMembers) {
            const ref = target.doc(`${Domain.Galleries}/${g}`);
            if (!(await ref.get()).exists) { console.warn(`  gallery missing in target, skipping refs: ${g}`); continue; }
            await ref.update({
                projects: FieldValue.arrayUnion(...m.projects),
                howTos: FieldValue.arrayUnion(...m.howTos),
            });
        }
        console.log(`Reconciled membership for ${galleryMembers.size} gallery(ies).`);
    }

    console.log('\nDone. Verify in the app and re-check dependent flattened fields if a CF normally maintains them.');
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));
