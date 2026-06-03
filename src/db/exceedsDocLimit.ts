/** Firestore rejects any document larger than 1,048,576 bytes. */
export const MAX_DOC_BYTE_SIZE = 1048576;

/**
 * Estimate whether a serialized Firestore document would exceed the 1 MiB
 * limit. Like {@link Project.getSourceByteSize} and the chat-message trimmer,
 * this is a deliberate estimate (character count of the JSON) rather than an
 * exact UTF-8 byte count: it's cheap, runs before every save, and a generous
 * margin below 1 MiB means the approximation is safe. Refusing the write here
 * surfaces a clear banner instead of an opaque Firestore rejection.
 */
export default function exceedsDocLimit(data: unknown): boolean {
    return JSON.stringify(data).length > MAX_DOC_BYTE_SIZE;
}
