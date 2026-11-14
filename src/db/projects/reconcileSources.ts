/**
 * Whose code a tracked project keeps when another copy of it arrives.
 *
 * A project's metadata merges per field, but its code does not: for a project
 * nobody has open there is no live document to merge into, so one copy's
 * sources replace the other's. Which one is decided here, and the rule is that
 * code which has not reached the cloud is never the copy that is replaced
 * silently. Kept in a plain module (no Svelte, no Firebase) so every arrival
 * order can be tested as a table.
 */

import type { CodeState } from '#db/projects/ProjectHistory.svelte.ts';

export type Arrival = {
    /** A cloud snapshot, or a row read from this device's storage. */
    from: 'cloud' | 'device';
    /** A device row's first read after a page load, as opposed to a later
     *  one, which is another tab (or this one) having just written it. */
    initial: boolean;
    /** The device row's last cloud save was never confirmed. */
    dirty: boolean;
    /** A live editing session is open on the project in this tab. */
    open: boolean;
    /** The state of the code this tab holds. */
    code: CodeState;
    /** How the arriving copy's timestamp compares to the one held. */
    age: 'newer' | 'same' | 'older';
    /** Both copies have the same code. */
    same: boolean;
};

export type Reconciliation = {
    /** Whose sources the merged project has. */
    sources: 'held' | 'arriving';
    /** Whether the other copy's code is kept as a checkpoint, because it may
     *  exist nowhere else once the merged project is saved. */
    checkpoint: boolean;
    /** Whether the merged project has to be sent to the cloud. */
    push: boolean;
};

const Keep: Reconciliation = {
    sources: 'held',
    checkpoint: false,
    push: false,
};

export function reconcileSources(arrival: Arrival): Reconciliation {
    if (arrival.same) return Keep;

    if (arrival.from === 'cloud') {
        // A live session merges the cloud's code character by character.
        if (arrival.open) return Keep;
        // Only a newer copy can replace ours.
        if (arrival.age !== 'newer') return Keep;
        // Ours is confirmed, so the newer copy holds everything ours does.
        if (arrival.code === 'saved')
            return { sources: 'arriving', checkpoint: false, push: false };
        // Ours has edits the cloud never saw. A newer timestamp does not make
        // them older work: opening a project on another device is enough to
        // advance it. Keep ours and remember theirs.
        return { sources: 'held', checkpoint: true, push: true };
    }

    // Code changed in this tab stays. A row another tab wrote is not answered
    // with a save of our own, either: two tabs typing in one project would
    // each answer the other's row for as long as both were offline.
    if (arrival.code === 'typed') return Keep;

    // The page loaded and the cloud's copy was tracked before this row was
    // read. The row holds an edit that was never confirmed, so it wins, and it
    // has to be sent. If the cloud's copy is the later one it is about to be
    // replaced, so remember it.
    if (arrival.initial && arrival.dirty)
        return {
            sources: 'arriving',
            checkpoint: arrival.age === 'older',
            push: true,
        };

    // Another tab saved a later version to this device. That tab sends it.
    if (arrival.age === 'newer' && !arrival.open)
        return { sources: 'arriving', checkpoint: false, push: false };

    return Keep;
}
