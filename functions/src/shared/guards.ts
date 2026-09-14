/** Type guards for values whose shape is not yet known: a document read from
 *  Firestore, a body from a third-party API, JSON from a client. The client
 *  keeps its own copy in src/util/guards.ts; functions/ cannot import src/. */

/** A plain object with string keys, excluding arrays and null. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An array whose every element is a string. */
export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** A field of a document snapshot as the unknown value it is. Firestore's
 *  `DocumentSnapshot.get` is typed `any`, which would let a read flow into
 *  typed code unchecked; naming it unknown makes the caller narrow it. */
export function fieldOf(
    snapshot: { get(field: string): unknown },
    field: string,
): unknown {
    return snapshot.get(field);
}

/** The message of whatever was thrown, since a `catch` variable is `unknown`. */
export function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** A value an earlier check already required, restated where TypeScript cannot
 *  carry the narrowing. Throws rather than returning a default, since a default
 *  here would write to the wrong file. */
export function must<Kind>(value: Kind | undefined | null, what: string): Kind {
    if (value === undefined || value === null)
        throw new Error(`Expected ${what}.`);
    return value;
}
