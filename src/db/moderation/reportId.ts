import type { ReportSubjectKind } from 'shared-types';

/**
 * The document id for a report about one thing (#938).
 *
 * Deterministic, so reporting the same thing twice adds a reporter to one
 * document rather than making a second one. `ReportButton` has claimed this
 * behavior in a comment since #193 while calling `addDoc`, which mints a random
 * id — so a reload made a duplicate, and a moderator saw the same project twice.
 *
 * A chat message needs both ids: a message id is unique within its chat, and
 * nothing guarantees it is unique across chats.
 *
 * Keep in sync with functions/src/reportId.ts (the functions↔src wall
 * prevents a single shared module; responsibilitySync.test.ts holds both
 * copies to one table).
 */
export default function reportId(
    kind: ReportSubjectKind,
    subject: string,
    message?: string,
): string {
    // Firestore forbids '/' in a document id and nothing else we use here, and
    // ids are uuids, so a ':' join can't collide across kinds.
    return kind === 'chat' && message !== undefined
        ? `chat:${subject}:${message}`
        : `${kind}:${subject}`;
}
