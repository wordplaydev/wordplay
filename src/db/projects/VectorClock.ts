/**
 * Per-field Lamport stamps for project metadata.
 *
 * A `FieldStamp` is the pair `(counter, writer)`. When a client writes a field,
 * it sets the stamp's counter to one more than the highest counter it has seen
 * (across all fields of this project) and tags it with its own client ID. On
 * merge, the stamp with the higher counter wins, with the writer ID as the
 * deterministic tiebreak — so concurrent writes to *different* fields preserve
 * both edits, and concurrent writes to the *same* field converge on the same
 * winner across all replicas.
 *
 * This is the mechanism that fixes #135 — the per-project scalar `timestamp`
 * compared whole projects against each other and clobbered fields that the
 * other side hadn't touched.
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
export function mergeStamps(
    a: ProjectStamps,
    b: ProjectStamps,
): ProjectStamps {
    const fields: Record<string, FieldStamp> = {};
    const keys = new Set([
        ...Object.keys(a.fields),
        ...Object.keys(b.fields),
    ]);
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
