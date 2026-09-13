import type {
    Change,
    DocumentSnapshot,
    FirestoreEvent,
} from 'firebase-functions/v2/firestore';
import { nextModeration } from './moderationRequest.js';

/**
 * Maintains the fields on a how-to no client may write (#906): `moderation`, the
 * decision that turns a request to be listed in the guide into a listing, and
 * `moderatedAt`, which orders the queue by who asked first.
 *
 * A trigger rather than part of a callable, for the reason `kitEdited` is one: a
 * listing has to be reconsidered whenever the how-to changes what a reader of the
 * guide would see. Approval was of what it was.
 *
 * The shape is the gallery's rather than the kit's, and the difference is worth
 * stating. A kit keeps its `listed`/`listedVersion` while a new version waits,
 * because approval was of a *version* and the old one is still there, unchanged.
 * A how-to has one body: the document the guide renders is the document that
 * changed. So a content edit sends it back to `pending` and it leaves the guide
 * until someone looks again, exactly as an edited gallery leaves the public list.
 */

/** A record as the trigger sees it: an unparsed Firestore document, or nothing. */
type HowToRecord = Record<string, unknown> | undefined;

/** A string list off an unparsed document, or empty. */
function listOf(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

/**
 * Whether two string lists are the same, in order.
 *
 * Order matters here and does not in `sameWords`: `text[i]` is the answer to
 * `guidingQuestions[i]`, so reordering either re-pairs every question with a
 * different answer. Sorting them, as a search index may, would call that no change
 * at all.
 */
function sameList(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * Whether a how-to is asking to be listed in the guide.
 *
 * All three, and not `submittedToGuide` alone: a moderator can only approve
 * something a reader could then reach, and `published` and `isPublic` are what
 * decide that. It is also what makes the guide's query safe — it filters on the
 * same three, so every document it returns is one the read rule admits.
 *
 * This is also the whole of the withdrawal path. Unposting a how-to, making it
 * private, or taking the request back all make this false, `nextModeration`
 * answers `unrequested`, and it leaves the guide. No separate delisting branch.
 */
export function requestedForGuide(howTo: HowToRecord): boolean {
    return (
        howTo !== undefined &&
        howTo.submittedToGuide === true &&
        howTo.published === true &&
        howTo.isPublic === true
    );
}

/**
 * Whether an edit changed what a reader of the guide would see.
 *
 * Exactly the title, the guiding questions, the answers, and the languages it is
 * written in — the whole of what the guide renders. Each exclusion earns its place:
 *
 * - `social` is writable by any gallery member and any expanded-access viewer,
 *   through the rules' `hasOnly(["social"])` opening. A bookmark, a reaction or a
 *   view count must never cost someone their listing. Moving `submittedToGuide`
 *   out of `social` is what makes "`social` is never content" true.
 * - `xcoord`/`ycoord` are writable by any gallery member through the other opening,
 *   so counting them would make dragging someone's tile a way to unlist their work.
 * - `collaborators` is who may edit, not what was read. A new collaborator's *edit*
 *   re-queues it, which is the guard that matters.
 * - `preview` is derived from `text` and written separately, so it would re-queue
 *   on a recompute that changed no prose.
 * - `scopeOverwrite` governs expanded access inside the gallery; a listed how-to is
 *   world-readable through `isPublic` regardless.
 * - `published`, `isPublic` and `submittedToGuide` are the request itself, carried
 *   by `requestedForGuide`.
 * - `moderation`, `moderatedAt` and `flags` are this trigger's own write, and being
 *   blind to them is what stops it looping.
 */
export function howToContentChanged(
    before: HowToRecord,
    after: HowToRecord,
): boolean {
    if (before === undefined || after === undefined) return false;
    if (before.title !== after.title) return true;
    if (
        !sameList(
            listOf(before.guidingQuestions),
            listOf(after.guidingQuestions),
        )
    )
        return true;
    if (!sameList(listOf(before.text), listOf(after.text))) return true;
    if (!sameList(listOf(before.locales), listOf(after.locales))) return true;
    return false;
}

export default async function howToEdited(
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { id: string }>,
): Promise<unknown> {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    // Deleted, or never there.
    if (after === undefined) return;

    const moderation =
        typeof after.moderation === 'string' ? after.moderation : 'unrequested';

    // A refusal stands until the creator asks again, and this is what makes that
    // true. The decision clears `submittedToGuide` so the how-to does not bounce
    // straight back into the queue — but `nextModeration` answers `unrequested`
    // for anything not currently asking, which would erase the refusal in the
    // same breath and leave the creator with no explanation. Their next press of
    // the button sets the request again, and the ordinary rule takes it from
    // `denied` to `pending`.
    if (moderation === 'denied' && !requestedForGuide(after)) return;

    const next = nextModeration(
        moderation,
        requestedForGuide(after),
        howToContentChanged(before, after),
    );

    // This trigger's own write comes back through it, so writing nothing when
    // nothing changed is what stops it looping — and a how-to is written far more
    // often than a gallery or a kit (every bookmark, every reaction, every
    // debounced autosave), so this is the common path, not the rare one.
    // `nextModeration` is idempotent for the same reason.
    if (next === moderation) return;

    return event.data?.after.ref.update({
        moderation: next,
        moderatedAt: Date.now(),
    });
}
