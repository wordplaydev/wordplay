/**
 * What happens to each project stored on a device when its local data is wiped.
 *
 * Signing out deletes everything, unsaved work included: it is how someone makes
 * sure nothing of theirs stays on a device, and it is called with no `holder`.
 *
 * The other wipe is not anyone's decision. A different account signs in on a
 * device whose last session lapsed (a classroom laptop back in the cart), and
 * what is cached there is not the next person's to see. But a project whose
 * last save never reached the cloud exists nowhere else, and its author never
 * chose to give it up. Those are set aside for them — held on the device,
 * shown to no one, and brought back when they sign in here again. Kept in a
 * plain module so the sorting can be tested without a database.
 */
export type StoredProject = { id: string; owner: string | null };

export type WipePlan<Row> = {
    /** Held, hidden, for the person who made the unsaved changes. */
    setAside: Row[];
    /** Left where they are: made by no account, so they go to whoever signs in. */
    kept: Row[];
    /** In the cloud already, so safe to forget here. */
    deleted: Row[];
};

export function planWipe<Row extends StoredProject>(
    rows: Row[],
    /** The projects whose last save was never confirmed. */
    dirty: ReadonlySet<string>,
    /** Whoever was signed in, if anyone: the one unsaved work is held for. */
    holder: string | null,
): WipePlan<Row> {
    const plan: WipePlan<Row> = { setAside: [], kept: [], deleted: [] };
    for (const row of rows) {
        if (row.owner === null) plan.kept.push(row);
        else if (holder !== null && dirty.has(row.id)) plan.setAside.push(row);
        else plan.deleted.push(row);
    }
    return plan;
}
