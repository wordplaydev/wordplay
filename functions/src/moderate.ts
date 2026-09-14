import { getAuth } from 'firebase-admin/auth';
import {
    FieldValue,
    getFirestore,
    type Firestore,
} from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { decidedListing } from './listingDecision.js';
import type {
    ModerateInputs,
    ModerateOutput,
    ReportSubjectKind,
    SerializedNotice,
    Strikes as StrikesRecord,
} from 'shared-types';
import { forgetMessageTranslations } from './chatTranslations.js';
import { hasClaim } from './claims.js';
import getResponsibility from './responsibility.js';
import { noStrikes, withFinding, withStrike } from './strikes.js';
import deliver, { emailNotice } from './notices.js';
import describeSubject, { curatorsOf } from './subject.js';

const ProjectsCollection = 'projects';
const GalleriesCollection = 'galleries';
const HowTosCollection = 'howtos';
const ChatsCollection = 'chats';
const CharactersCollection = 'characters';
const KitsCollection = 'kits';
const KitVersionsCollection = 'kitversions';
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
    const isMod = hasClaim(request.auth?.token, 'mod');
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

    // Only a platform moderator's decision is a listing decision; a curator's
    // is a takedown. Captured rather than recomputed, because it is also what
    // decides whether anyone is told the answer.
    const decided = decidedListing(listing, asPlatform);

    await applyRemedy(
        db,
        kind,
        subject,
        message,
        flags,
        violation,
        decided,
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
                // Keyed by the decision *and when it was made*, so a retry
                // tells them once but a second refusal after a fix is not
                // mistaken for the first. `decision` alone is stable per
                // subject and outcome, which silently swallowed the second.
                id: `decision-${decision}-${now}`,
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
                id: `outcome-${decision}-${now}`,
                kind: 'outcome',
                subject: where,
                title: found.title,
                time: now,
                ...(flagged.length > 0 ? { flags: flagged } : {}),
            },
        });
    }
    await deliver(db, deliveries);

    // The answer to a listing request. The bell derives these from the
    // subject's own `moderation` field, so they never reach `deliver` — and
    // hanging them off the `galleryEdited`/`kitEdited`/`howToEdited` triggers
    // would not work either: those run on this function's write and only ever
    // compute `pending` or `unrequested`. Here is where the decision is made,
    // and where who to tell is already known.
    if (decided !== undefined)
        await mailListing(db, {
            kind,
            subject,
            decided,
            where,
            title: found.title,
            author: found.author,
            curators,
            now,
        });

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
    // Whether this decision actually added a warning. `withStrike` returns the
    // record untouched for a decision it has already seen, and `count` is the
    // same either way — so without lifting this out, a retry would tell someone
    // by email that they had been warned again.
    let warned = false;
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
        warned = next.count !== current.count;
        transaction.set(strikesRef, next);
        return next;
    });

    if (updated.banned) await ban(db, found.author);

    // The warning itself, which the bell derives from the strike record and so
    // never reaches `deliver`. A curator's finding is not a strike and must not
    // send one; the guard above has already returned for that case.
    if (warned)
        await emailNotice([found.author], {
            id: `warning-${updated.count}`,
            kind: 'warning',
            subject: where,
            title: found.title,
            time: now,
            count: updated.count,
        });

    return { count: updated.count, banned: updated.banned, responsibility };
}

/** Who hears a listing decision, and as which notice kind. A gallery has no
 *  author, so its curators hear; a kit's owner and a how-to's writer hear about
 *  their own, and a collaborator does not — a decision is addressed to whoever
 *  asked for it. */
async function mailListing(
    db: Firestore,
    what: {
        kind: ReportSubjectKind;
        subject: string;
        decided: 'approved' | 'denied';
        where: SerializedNotice['subject'];
        title: string;
        author: string | null;
        curators: string[];
        now: number;
    },
): Promise<void> {
    const listed = what.decided === 'approved';
    const to =
        what.kind === 'gallery'
            ? what.curators
            : what.author === null
              ? []
              : [what.author];
    if (to.length === 0) return;

    const kind =
        what.kind === 'gallery'
            ? listed
                ? 'gallery-listed'
                : 'gallery-denied'
            : what.kind === 'kit'
              ? listed
                  ? 'kit-listed'
                  : 'kit-denied'
              : what.kind === 'howto'
                ? listed
                    ? 'howto-listed'
                    : 'howto-denied'
                : undefined;
    // A project or a character is never listed, so there is no answer to send.
    if (kind === undefined) return;

    await emailNotice(to, {
        // Keyed by when, so a second refusal after a fix is not mistaken for
        // the first — the same reason a decision notice carries `now`.
        id: `${what.kind}-${what.subject}-${what.decided}-${what.now}`,
        kind,
        subject: what.where,
        title: what.title,
        time: what.now,
    });
}

/**
 * What a decision writes on something that asks to be listed — a gallery, a kit.
 * A how-to writes the same shape by hand, because the field its listing withdraws
 * is `isPublic` rather than `public`.
 *
 * The listing decision is what lets anything ever reach `approved`; without it the
 * registry query (`public && moderation == 'approved'`) matches nothing ever published,
 * so the listing is unreachable rather than merely empty. Recorded even when the decision
 * is to keep, since what was decided is part of a creator's standing either way.
 */
function listedDecision(
    flags: Record<string, boolean | null>,
    violation: boolean,
    listing: 'approved' | 'denied' | undefined,
): Record<string, unknown> {
    return {
        flags,
        ...(listing === undefined
            ? {}
            : { moderation: listing, moderatedAt: Date.now() }),
        ...(violation ? { public: false } : {}),
    };
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
            .update(listedDecision(flags, violation, listing));
    else if (kind === 'character' && violation) {
        // Un-publishing alone would be theatre here (#1236). A character is
        // most often reported inside a class gallery, where it was never
        // public — so `public: false` would change nothing anyone could see,
        // and the drawing would stay in front of the class a curator just
        // decided about. Taking it out of the gallery is the remedy that
        // matches what was decided; the character itself is left with its
        // owner, who can fix it and share it again.
        const character = await db
            .collection(CharactersCollection)
            .doc(subject)
            .get();
        const gallery: unknown = character.get('gallery');
        const batch = db.batch();
        batch.update(character.ref, { public: false, gallery: null });
        if (typeof gallery === 'string' && gallery.length > 0)
            batch.update(db.collection(GalleriesCollection).doc(gallery), {
                characters: FieldValue.arrayRemove(subject),
            });
        await batch.commit();
    } else if (kind === 'kit') {
        // Unlisting the kit is not enough, and for a sharper version of the reason a
        // character is also pulled from its gallery (#1236): a kit's *versions* are what
        // a borrow actually reads, and they carry their own denormalized `public` so that
        // reading one costs no document access. Leaving them readable would mean a kit
        // taken down from the registry still running in everyone's projects.
        //
        // Bounded by MAX_KIT_VERSIONS, which exists so this stays one batch.
        //
        // A decision to *keep* still records the flags, the way a project's and a
        // gallery's do: what was decided is part of a creator's standing whether or not
        // it cost them the listing.
        const kitRef = db.collection(KitsCollection).doc(subject);
        const [kit, versions] = await Promise.all([
            // Approving lists the version that was approved, which is the newest one at
            // the moment of the decision — a later publish re-enters the queue without
            // disturbing it.
            listing === 'approved' ? kitRef.get() : undefined,
            violation
                ? db
                      .collection(KitVersionsCollection)
                      .where('kit', '==', subject)
                      .get()
                : undefined,
        ]);
        const latest = kit?.get('latest');
        const batch = db.batch();
        batch.update(kitRef, {
            ...listedDecision(flags, violation, listing),
            // The registry reads `listed`, not `moderation`, so this is what actually puts
            // a kit in front of people — and what takes it back out.
            ...(listing === 'approved' &&
            typeof latest === 'number' &&
            latest >= 1
                ? { listed: true, listedVersion: latest }
                : listing === 'denied' || violation
                  ? { listed: false, listedVersion: null }
                  : {}),
        });
        for (const version of versions?.docs ?? [])
            batch.update(version.ref, { public: false });
        await batch.commit();
    } else if (kind === 'howto')
        await db
            .collection(HowTosCollection)
            .doc(subject)
            .update({
                // Recorded on a keep as well as a violation, the way a project's
                // and a gallery's are: what was decided is part of a creator's
                // standing whether or not it cost them anything.
                flags,
                ...(listing === undefined
                    ? {}
                    : { moderation: listing, moderatedAt: Date.now() }),
                // A refusal takes the request back with it. Otherwise the
                // standing `submittedToGuide` sends the how-to straight back
                // into the queue — `nextModeration` reads a denial with the
                // request still on as "asking again" — and a moderator would
                // answer the same how-to forever. Asking again is the
                // creator's to do, which is what the refusal tells them.
                ...(listing === 'denied' ? { submittedToGuide: false } : {}),
                // A how-to that broke the rules stops being posted at all, not
                // merely unlisted: the space it sits in is where it does harm.
                // `isPublic` goes too, or re-posting it would put it back in
                // front of the world with nobody having looked again.
                ...(violation ? { published: false, isPublic: false } : {}),
            });
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
