/**
 * Per-field Lamport stamps for project metadata.
 *
 * # The problem we're solving (issue #135)
 *
 * Before this module existed, Wordplay reconciled two copies of a project
 * by comparing their `timestamp` field: whichever side's wall-clock was
 * later "won" and overwrote the other in full. That works fine when one
 * device is online, but it silently corrupts data the moment two devices
 * edit the same project at the same time. The reproduction in the bug:
 *
 *   - On device A you go offline and rename the project.
 *   - On device B (still online) you edit the source code.
 *   - You reconnect device A. Its timestamp is older, so its rename
 *     gets clobbered by B's "winning" copy — and B never knew about
 *     the rename, so the new name is just gone.
 *
 * The fix is to stop reasoning about whole-project order and start
 * reasoning about *per-field* order. A's edit to `name` and B's edit to
 * `code` happened in different parts of the project; nothing should
 * force one to lose to the other.
 *
 * # What a Lamport clock is, briefly
 *
 * A Lamport clock (Leslie Lamport, 1978) is a counter that only ever
 * goes up, used to give events a partial order without a synchronized
 * physical clock. The rule is simple: every time you make a change,
 * you set your counter to `max(seen_so_far) + 1`. When two replicas
 * merge, the counter on each field tells you which version observed
 * more history. If two stamps have the *same* counter — i.e. neither
 * causally precedes the other — the writes happened concurrently and
 * we need a deterministic tiebreak; we use the writer ID for that, so
 * every replica agrees on the same winner.
 *
 * # Where stamps sit in the wider design
 *
 * Wordplay merges two divergent copies of a project with two different
 * mechanisms, matched to the shape of the data:
 *
 *   - **Source code** (and source names) goes through a Yjs CRDT
 *     (ProjectCRDT.ts). Character-level convergence — when two people
 *     type in different functions, both sets of keystrokes survive.
 *     There's no winner to pick; both belong in the final string.
 *
 *   - **Metadata fields** go through these per-field Lamport stamps.
 *     They're scalars or short arrays where concurrent edits to the
 *     *same* field have to pick a winner; the only question is whose
 *     write came causally later.
 *
 * The reason metadata isn't *also* in the CRDT is that some metadata
 * has to stay as plain Firestore fields for the platform to function
 * at all:
 *
 *   - Firestore *security rules* can only inspect plain fields —
 *     they can't decode CRDT bytes. That forces `owner`,
 *     `collaborators`, `viewers`, `commenters` to stay plain.
 *   - Firestore *queries* (e.g. "all public listed projects in this
 *     gallery") need `where()` clauses against plain top-level
 *     fields. That forces `public`, `listed`, `gallery`, `archived`
 *     to stay plain.
 *
 * Stamps are how those plain fields stay correct under concurrent
 * edits without giving up on the queryability/security properties.
 * See `StampedMetadataFields` in Project.ts for the exact list and
 * the reasoning per field.
 */
export type FieldStamp = {
    /** Lamport counter at time of write. 0 means "never written by anyone". */
    c: number;
    /** ID of the client that wrote this field. Empty string for never-written. */
    w: string;
};

/** The sentinel "never written" stamp. */
export const NeverWritten: FieldStamp = { c: 0, w: '' };

/** Return 1 if a > b, -1 if a < b, 0 if equal. */
export function compareStamps(a: FieldStamp, b: FieldStamp): number {
    if (a.c !== b.c) return a.c > b.c ? 1 : -1;
    if (a.w !== b.w) return a.w > b.w ? 1 : -1;
    return 0;
}

/** Return whichever stamp is later (a wins ties). */
export function maxStamp(a: FieldStamp, b: FieldStamp): FieldStamp {
    return compareStamps(a, b) >= 0 ? a : b;
}

/**
 * Compute a new stamp for a write by `writer` against a project whose
 * highest-seen counter (across all fields) is `lamport`. The result advances
 * the Lamport clock by exactly one.
 */
export function nextStamp(lamport: number, writer: string): FieldStamp {
    return { c: lamport + 1, w: writer };
}

/**
 * The complete per-project stamp record: the Lamport ceiling plus a stamp
 * per field that has ever been written. Fields not present in `fields` are
 * treated as {@link NeverWritten} for merge purposes.
 */
export type ProjectStamps = {
    /** Highest counter ever observed for this project (max over all fields and all merges). */
    lamport: number;
    /** Per-field stamps. Keys are field names (e.g. 'name', 'public') or source-scoped keys (e.g. 'source.<id>.code'). */
    fields: Record<string, FieldStamp>;
};

/** A fresh, empty stamp record. */
export function emptyStamps(): ProjectStamps {
    return { lamport: 0, fields: {} };
}

/** Look up a field's stamp, returning {@link NeverWritten} if absent. */
export function getStamp(stamps: ProjectStamps, field: string): FieldStamp {
    return stamps.fields[field] ?? NeverWritten;
}

/**
 * Return a new stamp record where `field` has been bumped by `writer`.
 * Advances the project's Lamport ceiling by one.
 */
export function bumpField(
    stamps: ProjectStamps,
    field: string,
    writer: string,
): ProjectStamps {
    const stamp = nextStamp(stamps.lamport, writer);
    return {
        lamport: stamp.c,
        fields: { ...stamps.fields, [field]: stamp },
    };
}

/**
 * Per-field-winner merge of two stamp records. For each field present in
 * either side, take the stamp with the higher counter (writer-ID lex tiebreak).
 * The result's Lamport ceiling is the max of the two inputs.
 *
 * The companion to {@link mergeStamps} for *values* is {@link mergeField} — the
 * caller picks the value corresponding to the winning stamp.
 */
export function mergeStamps(a: ProjectStamps, b: ProjectStamps): ProjectStamps {
    const fields: Record<string, FieldStamp> = {};
    const keys = new Set([...Object.keys(a.fields), ...Object.keys(b.fields)]);
    for (const key of keys) {
        const sa = a.fields[key] ?? NeverWritten;
        const sb = b.fields[key] ?? NeverWritten;
        fields[key] = maxStamp(sa, sb);
    }
    return {
        lamport: Math.max(a.lamport, b.lamport),
        fields,
    };
}

/**
 * For a single field, return whichever side's value wins given both sides'
 * stamps. If the stamps tie exactly, `a` is preferred (the local replica).
 */
export function mergeField<T>(
    aValue: T,
    aStamp: FieldStamp,
    bValue: T,
    bStamp: FieldStamp,
): T {
    return compareStamps(aStamp, bStamp) >= 0 ? aValue : bValue;
}
