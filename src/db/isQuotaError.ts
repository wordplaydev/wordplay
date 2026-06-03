/**
 * Whether an error from a local (IndexedDB/Dexie) write is a storage-quota
 * failure — i.e. this device is out of room, not a transient or logic error.
 *
 * The shape is messy across browsers and Dexie's wrapping, so this is the one
 * place that owns it:
 *   - A raw `DOMException` named `QuotaExceededError` (the spec name; some
 *     engines also report `NS_ERROR_DOM_QUOTA_REACHED`).
 *   - A Dexie error whose own `name` is `QuotaExceededError`, or whose `inner`
 *     (the underlying IDB error Dexie wraps) is one of the above.
 *
 * Mirrors {@link firebaseErrorDetail} — centralized so every cache-write path
 * classifies a full-storage failure the same way.
 */
export default function isQuotaError(error: unknown): boolean {
    const isQuotaName = (name: unknown): boolean =>
        name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';

    if (error instanceof DOMException && isQuotaName(error.name)) return true;

    // Dexie wraps the underlying IndexedDB error; check both the wrapper's name
    // and its `inner` original error.
    if (typeof error === 'object' && error !== null) {
        const e = error as { name?: unknown; inner?: { name?: unknown } };
        if (isQuotaName(e.name)) return true;
        if (e.inner !== undefined && isQuotaName(e.inner.name)) return true;
    }

    return false;
}
