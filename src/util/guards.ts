/** Type guards for values whose shape is not yet known: parsed JSON, storage,
 *  documents from a database, a message from another process. */

/** A plain object with string keys, excluding arrays and null. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An array whose every element is a string. */
export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** The message of whatever was thrown, since a `catch` variable is `unknown`. */
export function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
