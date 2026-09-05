/**
 * Give a working username to accounts whose current one cannot be referenced
 * (#628).
 *
 * Usernames used to be validated only as "not an email, five or more
 * characters, no space", which admitted `_`, `-`, `.`, `$`, and `&` — all
 * Wordplay operators. So `@a_b/Cat` lexes as `@a` and the rest is lost, and
 * those creators' character references have been silently broken since
 * characters shipped.
 *
 * The repair writes a **handle** and reserves the cleaned name. It deliberately
 * does NOT touch the Firebase Auth email: since #628 the handle is what every
 * surface displays (`getCreators` prefers it over the synthesized address), so
 * changing the address would buy nothing and would break these creators'
 * logins. They keep signing in with the spelling they have always used, and
 * `findCreator` already resolves both — the new name through its reservation,
 * the old through the address.
 *
 * The original name is kept reserved, pointing at the same creator, so nobody
 * else can take it and any reference to it still resolves to them.
 *
 * Read the report before writing: `--dry` prints what it would do.
 *
 *   npx tsx scripts/repair-usernames.ts [dev|prod|emulator] [--dry]
 *
 * Against the emulator first, which needs no credentials:
 *
 *   firebase emulators:exec "npx tsx scripts/repair-usernames.ts emulator" \
 *     --project=demo-wordplay
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
// Imported rather than copied, from the source the server enforces — a repair
// that disagreed with the rule would either miss accounts or invent work.
import {
    foldUsername,
    isValidUsername,
    repairUsername,
    UsernameEmailDomain,
    usernameFromEmail,
} from '../functions/src/username';

const HandleCollection = 'handles';
const UsernameCollection = 'usernames';

const project = process.argv[2];
const dry = process.argv.includes('--dry');
if (project !== 'dev' && project !== 'prod' && project !== 'emulator') {
    console.log(
        'usage: npx tsx scripts/repair-usernames.ts [dev|prod|emulator] [--dry]',
    );
    process.exit(1);
}

if (project === 'emulator') {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST === undefined) {
        console.log(
            'Run this inside `firebase emulators:exec` so the emulator hosts are set.',
        );
        process.exit(1);
    }
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

const auth = getAuth();
const db = getFirestore();

type Plan = { uid: string; from: string; to: string };
const planned: Plan[] = [];
const skipped: { name: string; reason: string }[] = [];
let already = 0;

let token: string | undefined;
do {
    const page = await auth.listUsers(1000, token);
    token = page.pageToken;
    for (const user of page.users) {
        const derived = usernameFromEmail(user.email ?? '');
        // No synthesized address means no username to repair. Those accounts
        // need to *claim* one, which is a thing they do themselves.
        if (derived === undefined) continue;
        // A handle already decides their name; the address no longer does.
        if (
            (await db.collection(HandleCollection).doc(user.uid).get()).exists
        ) {
            already++;
            continue;
        }
        if (isValidUsername(derived)) continue;

        const repaired = repairUsername(derived);
        if (!isValidUsername(repaired)) {
            // Every automatic fix from here would be inventing a name they did
            // not choose. The profile tells them; they pick.
            skipped.push({
                name: derived,
                reason:
                    [...repaired].length < 5
                        ? `"${repaired}" is too short`
                        : `"${repaired}" is still not claimable`,
            });
            continue;
        }
        planned.push({ uid: user.uid, from: derived, to: repaired });
    }
} while (token);

console.log(`\n${planned.length} to repair, ${skipped.length} left alone.`);
if (already > 0) console.log(`${already} already have a handle.\n`);

for (const p of planned) console.log(`  ${p.from.padEnd(16)} → ${p.to}`);
if (skipped.length > 0) {
    console.log('\nLeft alone (they choose their own):');
    for (const s of skipped) console.log(`  ${s.name.padEnd(16)} ${s.reason}`);
}

if (dry) {
    console.log('\n--dry: nothing written.');
    process.exit(0);
}

let repaired = 0;
const collided: Plan[] = [];
for (const p of planned) {
    const now = Date.now();
    const reservation = db
        .collection(UsernameCollection)
        .doc(foldUsername(p.to));
    // Refuse rather than overwrite: a name someone else holds is not ours to
    // take, even to fix this.
    const held = await reservation.get();
    if (held.exists && (held.data()?.uid ?? null) !== p.uid) {
        collided.push(p);
        continue;
    }
    const batch = db.batch();
    batch.set(reservation, {
        v: 1,
        uid: p.uid,
        username: p.to,
        claimed: now,
    });
    // The original name stays reserved to the same creator, so nobody else can
    // take it and anything still pointing at it resolves to them.
    batch.set(db.collection(UsernameCollection).doc(foldUsername(p.from)), {
        v: 1,
        uid: p.uid,
        username: p.from,
        claimed: now,
        supersededBy: foldUsername(p.to),
    });
    batch.set(db.collection(HandleCollection).doc(p.uid), {
        v: 1,
        username: p.to,
        folded: foldUsername(p.to),
        claimed: now,
    });
    await batch.commit();
    repaired++;
}

console.log(`\nRepaired ${repaired}.`);
if (collided.length > 0) {
    console.log('Refused — the repaired name is held by someone else:');
    for (const p of collided) console.log(`  ${p.from} → ${p.to}`);
}
console.log(
    `Auth email untouched, so every one of them signs in exactly as before (${UsernameEmailDomain}).`,
);
