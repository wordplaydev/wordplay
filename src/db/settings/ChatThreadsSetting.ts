import Setting from '@db/settings/Setting';

/**
 * What a creator has already read in each thread (#821), keyed by conversation
 * id and then by the thread's root message id.
 *
 * A count rather than a timestamp, because that is the question the interface
 * asks: the reply control says how many replies a thread has, and it is marked
 * as new exactly when that number is bigger than the one remembered here. A
 * clock would need the messages' own times to be trustworthy across devices,
 * which they are not — `time` is `Date.now()` on whoever sent it.
 *
 * Synced rather than device-local: having read a thread is true of the person,
 * not the laptop, and the whole point of the marker is to survive going away
 * and coming back. Same reasoning as {@link ToursSetting}.
 */
export type ChatThreadsSeen = Record<string, Record<string, number>>;

function validate(value: unknown): ChatThreadsSeen | undefined {
    if (value == null || value.constructor.name !== 'Object') return undefined;
    const seen: ChatThreadsSeen = {};
    for (const [chat, threads] of Object.entries(value)) {
        if (threads == null || threads.constructor.name !== 'Object') continue;
        const counts: Record<string, number> = {};
        for (const [root, count] of Object.entries(threads))
            // Drop an entry that isn't a count rather than rejecting the whole
            // map: one bad row shouldn't re-mark every thread a creator read.
            if (
                typeof count === 'number' &&
                Number.isFinite(count) &&
                count >= 0
            )
                counts[root] = count;
        if (Object.keys(counts).length > 0) seen[chat] = counts;
    }
    return seen;
}

export const ChatThreadsSetting = new Setting<ChatThreadsSeen>(
    'chatThreads',
    false,
    {},
    validate,
    // Structural, not identity, and that distinction costs a Firestore write:
    // `Setting.set` calls `uploadSettings()` on any value it considers changed,
    // and `syncUser` re-applies a freshly parsed object on every sign-in — so
    // `===` would spend a full creator-document write re-saving what it just
    // read. Same comparison ProjectFoldersSetting makes, for the same reason.
    (current, value) => JSON.stringify(current) === JSON.stringify(value),
);
