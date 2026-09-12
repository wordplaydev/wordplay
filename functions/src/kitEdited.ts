import { foldWords, sameWords } from './searchWords.js';
import type {
    Change,
    DocumentSnapshot,
    FirestoreEvent,
} from 'firebase-functions/v2/firestore';
import { nextModeration } from './moderationRequest.js';

/**
 * Maintains the two fields on a kit no client may write (#8): `words`, the registry's
 * search index, and `moderation`, the decision that turns a request to be listed into a
 * listing. A creator who could write either could approve their own kit, or put it in
 * front of anyone searching for anything.
 *
 * A trigger rather than part of the publish callable, because a listing has to be
 * reconsidered whenever a kit changes what it says about itself.
 */

/** The text a kit is findable by: what it's called, what it says it's for, and what it shares. */
export function kitIndexText(kit: Record<string, unknown>): string[] {
    const texts: string[] = [];
    if (typeof kit.name === 'string') texts.push(kit.name.replace('/', ' '));
    if (typeof kit.description === 'string') texts.push(kit.description);
    // Export names are included because they are what a creator is actually looking for:
    // someone wants a `fade`, not a kit that happens to be called "colors".
    if (Array.isArray(kit.exports))
        for (const name of kit.exports)
            if (typeof name === 'string') texts.push(name);
    return texts;
}

/** A string list off an unparsed document, or empty. */
function listOf(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

/**
 * How far ahead of the server a client's clock may be before `updated` is replaced.
 *
 * `updated` is client-written and orders the whole registry, so `updated: 9e15` would pin
 * a kit to the top of it forever. A rule can't defend this: comparing against
 * `request.time` refuses the save outright, and a creator whose clock is a few minutes
 * fast would find publishing silently broken. Clamping here costs an extra write only in
 * the pathological case.
 */
const MaxClockSkew = 5 * 60 * 1000;

/** A record as the trigger sees it: an unparsed Firestore document, or nothing. */
type KitRecord = Record<string, unknown> | undefined;

/**
 * Whether an edit changed what the kit *claims about itself* — its name, its description,
 * what it shares, and what kinds those carry.
 *
 * The registry shows all four live, so a change to any of them has to be approved again
 * before the kit goes on being found. `kinds` is the one index a client writes, and is the
 * sharpest version of that reason: otherwise a kit could be approved as one thing and then
 * quietly claim to be every other.
 */
export function claimChanged(before: KitRecord, after: KitRecord): boolean {
    if (after === undefined) return false;
    return (
        before === undefined ||
        before.name !== after.name ||
        before.description !== after.description ||
        !sameWords(listOf(before.exports), listOf(after.exports)) ||
        !sameWords(listOf(before.kinds), listOf(after.kinds))
    );
}

/** Whether an edit published a new version, which is new code to have approved. */
export function versionAdded(before: KitRecord, after: KitRecord): boolean {
    return (
        before !== undefined &&
        after !== undefined &&
        before.latest !== after.latest
    );
}

/**
 * Whether an edit takes a listed kit back out of the registry.
 *
 * A new version does **not**: the version that earned the listing was approved and has not
 * changed, so it stays listed at `listedVersion` while the new one waits its turn. Only a
 * changed claim, or the creator withdrawing the request, unlists a kit — and a moderator's
 * own decision writes these fields directly rather than coming through here.
 */
export function unlists(before: KitRecord, after: KitRecord): boolean {
    if (after === undefined || after.listed !== true) return false;
    return claimChanged(before, after) || after.public !== true;
}

export default async function kitEdited(
    event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { id: string }>,
): Promise<unknown> {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    // Deleted, or never there. Kits are never deleted by a client, but a moderator's
    // tooling might.
    if (after === undefined) return;

    const words = foldWords(kitIndexText(after));
    const storedWords = Array.isArray(after.words)
        ? (after.words as string[])
        : [];

    const claimed = claimChanged(before, after);
    const version = versionAdded(before, after);

    const moderation =
        typeof after.moderation === 'string' ? after.moderation : 'unrequested';
    const next = nextModeration(
        moderation,
        after.public === true,
        claimed || version,
    );

    const update: Record<string, unknown> = {};
    if (!sameWords(words, storedWords)) update.words = words;
    if (next !== moderation) {
        update.moderation = next;
        update.moderatedAt = Date.now();
    }
    if (unlists(before, after)) {
        update.listed = false;
        update.listedVersion = null;
    }
    // See `MaxClockSkew`. The re-entry this write causes changes none of the fields
    // `claimChanged` or `versionAdded` read, so it settles rather than looping.
    const now = Date.now();
    if (typeof after.updated !== 'number' || after.updated > now + MaxClockSkew)
        update.updated = now;

    // This trigger's own write comes back through it, so writing nothing when nothing
    // changed is what stops it looping. `nextModeration` is idempotent for the same
    // reason, and is tested as such on the gallery side.
    if (Object.keys(update).length === 0) return;

    return event.data?.after.ref.update(update);
}
