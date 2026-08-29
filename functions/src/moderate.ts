import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type {
    ModerateInputs,
    ModerateOutput,
    ReportSubjectKind,
    SerializedNotice,
    Strikes as StrikesRecord,
} from 'shared-types';
import { forgetMessageTranslations } from './chatTranslations.js';
import getResponsibility from './responsibility.js';
import { noStrikes, withFinding, withStrike } from './strikes.js';
import deliver from './notices.js';
import describeSubject, { curatorsOf } from './subject.js';

const ProjectsCollection = 'projects';
const GalleriesCollection = 'galleries';
const HowTosCollection = 'howtos';
const ChatsCollection = 'chats';
const ReportsCollection = 'reports';
const StrikesCollection = 'strikes';

/** Firestore caps a batched write at 500 operations. */
const BatchLimit = 450;

/**
 * Record a decision about something someone asked to have reviewed (#938).
 *
 * One callable for every kind of thing, because who may decide is derived from
 * the thing's visibility rather than from what kind of thing it is. It
 * supersedes `moderateProject` and `moderateGallery`, which stay for one
 * release as shims: a callable is versioned by deploy, but a long-open tab
 * holds a stale client bundle, and deleting them the same day would break a
 * moderator mid-queue.
 *
 * Two things it does that no client could. It re-derives responsibility from
 * the subject's *current* visibility, so a project that has left a gallery
 * can't still be decided by that gallery's old curators — the `moderators` list
 * on a report routes reads only and is never trusted for this. And it delivers
 * the outcome to the people who cannot read it for themselves: the author, and
 * everyone who reported it.
 */
export default async function moderate(
    request: CallableRequest<ModerateInputs>,
): Promise<ModerateOutput> {
    const uid = request.auth?.uid;
    if (uid === undefined)
        throw new HttpsError(
            'unauthenticated',
            'Deciding requires an account.',
        );

    const { kind, subject, message, flags, note, listing, strike, decision } =
        request.data;
    if (typeof subject !== 'string' || subject.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a subject id.');
    if (typeof flags !== 'object' || flags === null)
        throw new HttpsError('invalid-argument', 'Expected flags.');
    if (typeof decision !== 'string' || decision.length === 0)
        throw new HttpsError('invalid-argument', 'Expected a decision id.');

    const db = getFirestore();
    const found = await describeSubject(db, kind, subject, message);
    if (found === undefined)
        throw new HttpsError('not-found', 'No such thing.');

    // Current visibility, not the visibility recorded when it was reported.
    const responsibility = getResponsibility(found.visibility);
    const gallery =
        responsibility.kind === 'curators' || responsibility.kind === 'both'
            ? responsibility.gallery
            : undefined;
    const curators = gallery === undefined ? [] : await curatorsOf(db, gallery);
    const isMod = request.auth?.token.mod === true;
    const asPlatform =
        isMod &&
        (responsibility.kind === 'platform' || responsibility.kind === 'both');
    const asCurator = curators.includes(uid);
    if (!asPlatform && !asCurator)
        throw new HttpsError(
            'permission-denied',
            'Only whoever is responsible for this can decide about it.',
        );

    const violation = Object.values(flags).some((state) => state === true);
    const flagged = Object.entries(flags)
        .filter(([, state]) => state === true)
        .map(([flag]) => flag);
    const now = Date.now();

    // What the report is holding, so keeping the message can put it back.
    const held =
        kind === 'chat' && message !== undefined
            ? (
                  await db
                      .collection(ReportsCollection)
                      .doc(`chat:${subject}:${message}`)
                      .get()
              ).get('text')
            : undefined;

    await applyRemedy(
        db,
        kind,
        subject,
        message,
        flags,
        violation,
        listing,
        typeof held === 'string' ? held : undefined,
    );

    // Resolve what was asked, and refresh the routing while we're here, so a
    // curator added since the report still sees the rest of their queue.
    // Two queries, because reports were generalized in #938: `subject` is the
    // field now, but a report raised before that carries `project` and is only
    // rewritten in bulk by ReportMigration.js. Rules, client, and functions all
    // deploy together, so there is a window — however long until the migration
    // runs — where a decision has to close both shapes or an old report stays
    // open forever with nobody able to see it.
    const [current, legacy] = await Promise.all([
        db
            .collection(ReportsCollection)
            .where('subject', '==', subject)
            .where('resolved', '==', false)
            .get(),
        db
            .collection(ReportsCollection)
            .where('project', '==', subject)
            .where('resolved', '==', false)
            .get(),
    ]);
    const seen = new Set<string>();
    const open = {
        docs: [...current.docs, ...legacy.docs].filter((doc) => {
            if (seen.has(doc.id)) return false;
            seen.add(doc.id);
            return true;
        }),
    };
    const reporters = new Set<string>();
    for (const report of open.docs) {
        if (message !== undefined && report.get('message') !== message)
            continue;
        // v1 named a single `reporter`; v2 keeps a list.
        for (const who of report.get('reporters') ?? []) reporters.add(who);
        const lone = report.get('reporter');
        if (typeof lone === 'string') reporters.add(lone);
        await report.ref.update({
            resolved: true,
            // The takedown is one-shot per message: someone may reasonably
            // report a kept message again, but that reopens the review rather
            // than hiding it a second time.
            ...(violation ? {} : { kept: true }),
            upheld: violation,
            moderator: uid,
            moderatedAt: now,
            flags,
            ...(note === undefined ? {} : { note }),
            moderators: curators,
        });
    }

    const where = {
        kind,
        id: subject,
        gallery: found.visibility.gallery,
        ...(message === undefined ? {} : { message }),
    };
    const deliveries: { to: string; notice: SerializedNotice }[] = [];
    if (found.author !== null && found.author !== uid)
        deliveries.push({
            to: found.author,
            notice: {
                // Keyed by the decision, so a retry tells them once.
                id: `decision-${decision}`,
                kind: 'decision',
                subject: where,
                title: found.title,
                time: now,
                ...(flagged.length > 0 ? { flags: flagged } : {}),
                // The note goes to the author alone: it may quote the content.
                ...(note === undefined ? {} : { note }),
            },
        });
    for (const who of reporters) {
        if (who === uid || who === found.author) continue;
        deliveries.push({
            to: who,
            notice: {
                id: `outcome-${decision}`,
                kind: 'outcome',
                subject: where,
                title: found.title,
                time: now,
                ...(flagged.length > 0 ? { flags: flagged } : {}),
            },
        });
    }
    await deliver(db, deliveries);

    // A curator's decision is recorded, never counted — and only when the
    // gallery was public, where the content was platform-visible anyway.
    if (
        !asPlatform &&
        asCurator &&
        violation &&
        gallery !== undefined &&
        found.visibility.galleryPublic &&
        found.author !== null
    )
        await note_finding(db, found.author, {
            gallery,
            kind,
            flags: flagged,
            time: now,
            decision,
        });

    // A warning is the platform's alone, and only a platform moderator
    // deciding something the platform is responsible for can issue one.
    if (
        !asPlatform ||
        !strike ||
        !violation ||
        found.author === null ||
        found.author.length === 0
    )
        return { count: 0, banned: false, responsibility };

    const strikesRef = db.collection(StrikesCollection).doc(found.author);
    const updated = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(strikesRef);
        const current: StrikesRecord = existing.exists
            ? { ...noStrikes(), ...existing.data() }
            : noStrikes();
        const next = withStrike(current, {
            decision,
            project: subject,
            flags: flagged,
            moderator: uid,
            time: now,
        });
        transaction.set(strikesRef, next);
        return next;
    });

    if (updated.banned) await ban(db, found.author);

    return { count: updated.count, banned: updated.banned, responsibility };
}

/** Do to the thing what the decision says. */
async function applyRemedy(
    db: Firestore,
    kind: ReportSubjectKind,
    subject: string,
    message: string | undefined,
    flags: Record<string, boolean | null>,
    violation: boolean,
    listing: 'approved' | 'denied' | undefined,
    held: string | undefined,
): Promise<void> {
    if (kind === 'project')
        // Something that broke the rules also stops being public: leaving it up
        // while warning its creator would be a warning with nothing behind it.
        await db
            .collection(ProjectsCollection)
            .doc(subject)
            .update(violation ? { flags, public: false } : { flags });
    else if (kind === 'gallery')
        await db
            .collection(GalleriesCollection)
            .doc(subject)
            .update({
                ...(listing === undefined
                    ? {}
                    : { moderation: listing, moderatedAt: Date.now() }),
                flags,
                ...(violation ? { public: false } : {}),
            });
    else if (kind === 'howto' && violation)
        await db
            .collection(HowTosCollection)
            .doc(subject)
            .update({ published: false });
    else if (kind === 'chat' && message !== undefined) {
        await db
            .collection(ChatsCollection)
            .doc(subject)
            .update({
                [`moderation.${message}`]: violation ? 'removed' : 'approved',
                // Keeping a message puts its words back. Removing one leaves
                // them only on the report, where whoever is responsible can
                // still read what they decided about.
                ...(violation || held === undefined
                    ? {}
                    : { messages: await restored(db, subject, message, held) }),
            });
        // Removing a message means its words survive only on the report.
        // Reporting it already emptied the cache, but a translation pass in
        // flight when the message was hidden can land afterwards, so this is
        // the one that has to be true rather than the one that usually is.
        //
        // Keeping deliberately does not evict: the text goes back verbatim, so
        // a surviving translation is still a translation of it.
        if (violation) await forgetMessageTranslations(db, subject, message);
    }
}

/** The chat's messages with one message's text put back. */
async function restored(
    db: Firestore,
    chatID: string,
    messageID: string,
    text: string,
): Promise<unknown[]> {
    const chat = await db.collection(ChatsCollection).doc(chatID).get();
    const messages: { id?: string }[] = chat.get('messages') ?? [];
    return messages.map((m) => (m.id === messageID ? { ...m, text } : m));
}

/** Note a curator's decision on the author's record, without counting it. */
async function note_finding(
    db: Firestore,
    author: string,
    finding: Parameters<typeof withFinding>[1],
): Promise<void> {
    const ref = db.collection(StrikesCollection).doc(author);
    await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        const current: StrikesRecord = existing.exists
            ? { ...noStrikes(), ...existing.data() }
            : noStrikes();
        transaction.set(ref, withFinding(current, finding));
    });
}

/** Take away public sharing, and take down what is already public. */
async function ban(db: Firestore, owner: string): Promise<void> {
    const auth = getAuth();
    const user = await auth.getUser(owner);
    // Spread the existing claims: setCustomUserClaims replaces the whole
    // object, so writing { banned } alone would strip mod and teacher.
    await auth.setCustomUserClaims(owner, {
        ...(user.customClaims ?? {}),
        banned: true,
    });

    const published = await db
        .collection(ProjectsCollection)
        .where('owner', '==', owner)
        .where('public', '==', true)
        .get();
    let batch = db.batch();
    let pending = 0;
    for (const doc of published.docs) {
        batch.update(doc.ref, { public: false });
        if (++pending >= BatchLimit) {
            await batch.commit();
            batch = db.batch();
            pending = 0;
        }
    }
    if (pending > 0) await batch.commit();
}
