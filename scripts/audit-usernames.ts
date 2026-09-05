/**
 * Report existing accounts whose username cannot be half of a
 * `@username/Character` reference (#628).
 *
 * Usernames used to be validated only as "not an email, five or more
 * characters, no space". That let through `_`, `-`, and `.`, all of which are
 * Wordplay operators — so `@a_b/Cat` lexes as `@a` and the rest is lost. Those
 * creators' character references are *already* broken, silently, and have been
 * since characters shipped. The new claim rule stops it happening again but
 * deliberately does not apply retroactively: tightening it for sign-in would
 * lock people out of their own accounts.
 *
 * This script is how we find out how many people are affected before deciding
 * what to offer them. It only reads.
 *
 * Run it with a service key in the repo root, like claims.js:
 *   npx tsx scripts/audit-usernames.ts [dev|prod]
 *
 * Or against the emulator first, to see what it prints before pointing it at
 * real accounts:
 *
 *   firebase emulators:exec "npx tsx scripts/audit-usernames.ts emulator" \
 *     --project=demo-wordplay
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// The rule itself is imported rather than copied, straight from the source the
// server enforces. A third copy would drift, and a drifted audit does not break
// the app — it mis-reports, either inventing a backlog of affected creators or
// hiding one. Importing the TypeScript directly (rather than functions/lib) is
// why this is a .ts script run with tsx: `lib` is gitignored build output, and
// type-checking it would fail on a fresh clone.
import {
    isValidUsername,
    ReservedLetters,
    UsernameEmailDomain,
    UsernameLength,
    UsernameMaxLength,
} from '../functions/src/username';

const Charset = /^[\p{L}\p{M}\p{N}]+$/u;
const StartsWithLetter = /^\p{L}/u;

/** Why a name fails, for the summary. The decision itself is isValidUsername's. */
function why(name: string): string {
    const points = [...name];
    if (points.length < UsernameLength) return 'too short';
    if (points.length > UsernameMaxLength) return 'too long';
    if (name.normalize('NFKC') !== name) return 'a compatibility spelling';
    if (points.some((c) => ReservedLetters.includes(c)))
        return 'contains \u0192 or \u00f8, which are Wordplay syntax';
    if (!Charset.test(name))
        return 'contains something other than letters, marks, and digits';
    if (!StartsWithLetter.test(name)) return 'does not start with a letter';
    return 'mixes Latin and non-Latin scripts, which cannot lex as one name';
}

const project = process.argv[2];
if (project !== 'dev' && project !== 'prod' && project !== 'emulator') {
    console.log('usage: node scripts/audit-usernames.js [dev|prod|emulator]');
    process.exit(1);
}

if (project === 'emulator') {
    // The emulator needs no credentials, which is what makes a dry run
    // possible before this is ever pointed at real accounts.
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST === undefined) {
        console.log(
            'Run this inside `firebase emulators:exec` so the emulator hosts are set.',
        );
        process.exit(1);
    }
    initializeApp({ projectId: 'demo-wordplay' });
} else {
    const serviceKeyPath = `wordplay-${project}-service-key.json`;
    let serviceAccount: object;
    try {
        serviceAccount = JSON.parse(readFileSync(serviceKeyPath, 'utf8'));
    } catch (error) {
        console.log(`Couldn't read service key at ${serviceKeyPath}: ${error}`);
        process.exit(1);
    }
    initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();

let accounts = 0;
let usernameAccounts = 0;
const unlexable: {
    uid: string;
    username: string;
    reason: string;
    hasHandle: boolean;
}[] = [];
const noHandle: string[] = [];

let token: string | undefined;
do {
    const page = await auth.listUsers(1000, token);
    token = page.pageToken;
    for (const user of page.users) {
        accounts++;
        const email = user.email ?? '';
        const derived = email.endsWith(UsernameEmailDomain)
            ? email.slice(0, -UsernameEmailDomain.length)
            : undefined;
        const handle = (
            await db.collection('handles').doc(user.uid).get()
        ).data();
        const username = handle?.username ?? derived;
        if (username === undefined) {
            // An email account with no handle: it has no username at all, so
            // nothing can name it. Should be impossible after #628, since
            // joinAccount always writes one.
            noHandle.push(user.uid);
            continue;
        }
        usernameAccounts++;
        if (!isValidUsername(username))
            unlexable.push({
                uid: user.uid,
                username,
                reason: why(username),
                hasHandle: handle !== undefined,
            });
    }
} while (token);

console.log(`\n${accounts} accounts, ${usernameAccounts} with a username.\n`);

if (noHandle.length > 0)
    console.log(
        `${noHandle.length} account(s) have no username at all:\n  ${noHandle.join('\n  ')}\n`,
    );

if (unlexable.length === 0) {
    console.log('Every username can be referenced. Nothing to do.');
} else {
    console.log(
        `${unlexable.length} username(s) cannot be half of a @username/Character reference:\n`,
    );
    const byReason = new Map<string, number>();
    for (const row of unlexable)
        byReason.set(row.reason, (byReason.get(row.reason) ?? 0) + 1);
    for (const [reason, count] of [...byReason].sort((a, b) => b[1] - a[1]))
        console.log(`  ${String(count).padStart(4)}  ${reason}`);
    console.log('');
    for (const row of unlexable)
        console.log(
            `  ${row.username}  (${row.uid}${row.hasHandle ? '' : ', no handle'})`,
        );
    console.log(
        '\nThese references are already broken and have been since characters shipped.',
    );
    console.log(
        'Renaming is not offered anywhere: a username is immutable because character',
    );
    console.log(
        'names embed it. Decide deliberately whether to offer these creators a rename',
    );
    console.log('with a migration of their character names, or leave them.');
}
