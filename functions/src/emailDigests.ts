import { fieldOf, isStringArray } from './shared/guards.js';
import { PromisePool } from '@supercharge/promise-pool';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { chatDigest, reviewDigest } from './email/messages/digest.js';
import { notifyByEmail } from './email/notify.js';
import { hasClaim } from './claims.js';

/**
 * The two summaries that nothing else could send.
 *
 * Scheduled rather than triggered, for two different reasons.
 *
 * Chat has no server event at all: there is deliberately no trigger on
 * `chats/{id}`, because the same document is written by *readers* clearing
 * their unread flag and by participant sync from unrelated project edits, so a
 * trigger would fire on far more than messages.
 *
 * Review work has the opposite problem — it has several sources and no single
 * moment. A gallery, kit, or how-to entering the queue is written by a trigger
 * that tells nobody, and a platform moderator is not reachable per event at
 * all: `mod` is a custom claim set by hand, and claims cannot be queried. Once
 * a day, a `listUsers` sweep can afford to find them; once a report, it cannot.
 */

/** How long before someone can be summarized again. */
const CooldownMs = 20 * 60 * 60 * 1000;

/** Cap each run so a large backlog doesn't land in one invocation; successive
 *  ticks drain the rest, as `purgeArchivedProjects` does. */
const PerRun = 200;

/** Stop counting once there is plainly work; the number is a nudge, not a
 *  report, and a full count would read every pending document. */
const CountLimit = 25;

const UsageCollection = 'usage';

/**
 * Whether this creator may be summarized now, and the note that says they were.
 *
 * On `usage/{uid}` rather than `creators/{uid}`: this is server-authoritative
 * state, and the creator document is client-writable and overwritten wholesale
 * on every settings change, so a timestamp there would be both forgeable and
 * clobbered.
 */
async function offCooldown(
    db: Firestore,
    uid: string,
    kind: 'review' | 'chat',
    now: number,
    dry: boolean,
): Promise<boolean> {
    const ref = db.collection(UsageCollection).doc(uid);
    const last = (await ref.get()).get(`email.${kind}`);
    if (typeof last === 'number' && now - last < CooldownMs) return false;
    if (!dry) await ref.set({ email: { [kind]: now } }, { merge: true });
    return true;
}

/** How many things are waiting for this reviewer, up to `CountLimit`. */
async function reviewCount(
    db: Firestore,
    uid: string,
    platform: boolean,
): Promise<number> {
    // A platform moderator is told about listing decisions, everyone else
    // about the reports they were named on, so the two differ in one clause.
    const scope = db.collection('reports');
    const reports = await (
        platform
            ? scope.where('platform', '==', true)
            : scope.where('moderators', 'array-contains', uid)
    )
        .where('resolved', '==', false)
        .limit(CountLimit)
        .get();

    // Only a platform moderator can decide a listing, so only they are told
    // about one waiting.
    if (!platform) return reports.size;

    let count = reports.size;
    for (const collection of ['galleries', 'kits', 'howtos']) {
        if (count >= CountLimit) break;
        const pending = await db
            .collection(collection)
            .where('moderation', '==', 'pending')
            .limit(CountLimit - count)
            .get();
        count += pending.size;
    }
    return count;
}

/** Everyone who reviews for the platform, by uid — moderators, and the
 *  superusers whose `admin` claim implies `mod`. Paginated, and only ever once
 *  a day: a custom claim is not a field any query can reach. */
async function platformModerators(): Promise<string[]> {
    const auth = getAuth();
    const uids: string[] = [];
    let page: string | undefined;
    do {
        const result = await auth.listUsers(1000, page);
        for (const user of result.users)
            if (hasClaim(user.customClaims, 'mod')) uids.push(user.uid);
        page = result.pageToken;
    } while (page !== undefined);
    return uids;
}

/** Curators of any gallery, who review what their gallery holds. */
async function curators(db: Firestore): Promise<string[]> {
    const galleries = await db.collection('galleries').get();
    const uids = new Set<string>();
    for (const gallery of galleries.docs) {
        // A gallery whose curators field is missing or malformed contributes
        // nobody, rather than throwing on a value that is not iterable.
        const curating = fieldOf(gallery, 'curators');
        if (isStringArray(curating)) for (const uid of curating) uids.add(uid);
    }
    return [...uids];
}

export async function sendReviewDigests(dry = false): Promise<number> {
    const db = getFirestore();
    const now = Date.now();
    const moderators = new Set(await platformModerators());
    const reviewers = [...new Set([...moderators, ...(await curators(db))])];

    let sent = 0;
    await PromisePool.for(reviewers.slice(0, PerRun))
        .withConcurrency(3)
        .process(async (uid) => {
            const count = await reviewCount(db, uid, moderators.has(uid));
            if (count === 0) return;
            if (!(await offCooldown(db, uid, 'review', now, dry))) return;
            if (dry) {
                sent += 1;
                return;
            }
            sent += await notifyByEmail([uid], 'reviews', (who) =>
                reviewDigest(count, who.locale),
            );
        });
    return sent;
}

export async function sendChatDigests(dry = false): Promise<number> {
    const db = getFirestore();
    const now = Date.now();

    // Iterate the people who asked, not the conversations: there is no index
    // for "any chat with anything unread", but `unread array-contains <uid>` is
    // one — and this group is off unless chosen, so the set is small.
    const asked = await db
        .collection('creators')
        .where('emailNotifications.activity', '==', true)
        .limit(PerRun)
        .get();

    let sent = 0;
    await PromisePool.for(asked.docs)
        .withConcurrency(3)
        .process(async (creator) => {
            const uid = creator.id;
            const unread = await db
                .collection('chats')
                .where('unread', 'array-contains', uid)
                .limit(CountLimit)
                .get();
            if (unread.empty) return;
            if (!(await offCooldown(db, uid, 'chat', now, dry))) return;
            if (dry) {
                sent += 1;
                return;
            }
            sent += await notifyByEmail([uid], 'activity', (who) =>
                chatDigest(unread.size, who.locale),
            );
        });
    return sent;
}
