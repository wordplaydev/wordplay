// The modular entry points, not the default `firebase-admin` export: under ESM
// that export has no `credential`, so `admin.credential.cert(...)` throws
// before the script reaches a single document.
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

/**
 * Migrate chats from v2 to v3 (#938).
 *
 * v2 kept three things on each message: its moderation state, who reported it,
 * and who decided. v3 keeps only the state, and moves it to a map on the chat
 * so the security rules can refuse it — a rule can name a top-level key, but
 * cannot reach inside an array to protect one field of one element, which is
 * why a participant could set their own reported message back to `approved`.
 *
 * `reporter` is why this script exists rather than leaving it to the client's
 * upgrader. A chat document is readable by every participant, including the
 * person whose message was reported, so a reporter named there is a public
 * accusation. `upgradeChat` strips it on read, but only for a chat somebody
 * opens: a conversation nobody returns to would keep that name indefinitely.
 *
 * It also creates a v2 report for every message still `pending`, so an
 * in-flight review isn't stranded when the client stops writing that state, and
 * moves the message's text onto the report the way `report` now does.
 *
 * Run this BEFORE deploying the rules that refuse `moderation` from clients.
 *
 * Usage: node ChatMigration.js dev|prod
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

const snapshot = await db.collection('chats').get();
console.log(`${snapshot.size} chat(s) to look at.`);

// Firestore caps a batch at 500 operations.
const LIMIT = 450;
let batch = db.batch();
let pending = 0;
async function flush() {
    if (pending > 0) await batch.commit();
    batch = db.batch();
    pending = 0;
}

let migrated = 0;
let reportsMade = 0;

for (const doc of snapshot.docs) {
    const chat = doc.data();
    if (chat.v === 3) continue;

    const moderation = {};
    const messages = [];
    for (const message of chat.messages ?? []) {
        if (message.moderation !== undefined)
            moderation[message.id] = message.moderation;

        // A review already under way keeps going, and one already decided
        // against keeps its words somewhere only the responsible can read
        // them. Both need a report: it is where a hidden message's text lives
        // now, and a message whose text stayed in the chat would be hidden
        // from the screen and readable by every participant in the document —
        // exactly the thing this change exists to stop.
        const hide =
            message.moderation === 'pending' ||
            message.moderation === 'removed';
        if (hide) {
            const id = `chat:${doc.id}:${message.id}`;
            batch.set(db.collection('reports').doc(id), {
                v: 2,
                kind: 'chat',
                subject: doc.id,
                message: message.id,
                gallery: null,
                // Filled in by the next report, or by galleryEdited when the
                // gallery's curators next change. Left empty rather than
                // guessed: routing someone a report they can't decide is worse
                // than routing nobody.
                moderators: [],
                platform: false,
                author: message.creator ?? null,
                // The one use of the reporter's name, and then it is gone.
                reporters: message.reporter ? [message.reporter] : [],
                time: message.time ?? Date.now(),
                ...(typeof message.text === 'string'
                    ? { text: message.text }
                    : {}),
                // A removed message's review is over; a pending one's is not.
                resolved: message.moderation === 'removed',
                ...(message.moderation === 'removed'
                    ? { upheld: true, moderator: message.moderator ?? null }
                    : {}),
            });
            reportsMade++;
            pending++;
        }

        messages.push({
            id: message.id,
            time: message.time,
            creator: message.creator,
            // A hidden message's words live on its report now — pending or
            // removed. Leaving a removed one here would hide it from the screen
            // while every participant could still read it in the document.
            text: hide ? null : (message.text ?? null),
        });
        if (pending >= LIMIT) await flush();
    }

    // v1 chats predate the `type` field that v2 added, and v3 still requires
    // it — a document jumped straight from v1 to v3 without one fails
    // ChatSchema.parse on every client, so the conversation simply stops
    // loading. Default it exactly as the client's own v1 upgrade does.
    batch.update(doc.ref, {
        v: 3,
        moderation,
        messages,
        ...(chat.type === undefined ? { type: 'project' } : {}),
    });
    migrated++;
    if (++pending >= LIMIT) await flush();
}
await flush();

console.log(
    `Migrated ${migrated} chat(s); moved ${reportsMade} hidden message(s) onto reports.`,
);
