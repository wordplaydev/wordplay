import type Project from '@db/projects/Project';
import { dependencyKey, type Dependency, type KitRef } from '@nodes/Borrow';
import Source from '@nodes/Source';

/** What {@link resolveKits} needs from the kit database, so it can be tested without one. */
export type KitResolver = {
    getByName: (name: string) => Promise<{ id: string } | null | undefined>;
    getVersion: (
        kit: string,
        version: number,
    ) => Promise<
        { sourceName: string; code: string; public: boolean } | null | undefined
    >;
};

/** Every distinct `{kit, version}` a project's borrows name. */
export function kitsNeededBy(
    project: Project,
): { ref: KitRef; version: number }[] {
    const needed = new Map<string, { ref: KitRef; version: number }>();
    for (const source of project.getSources())
        for (const borrow of source.expression.borrows) {
            const ref = borrow.getKitRef();
            const version = borrow.getVersion();
            // A borrow with no version is already a conflict (MissingKitVersion); there
            // is nothing to fetch, since a kit keeps every version it ever had.
            if (ref === undefined || version === undefined) continue;
            needed.set(dependencyKey(ref, version), { ref, version });
        }
    return [...needed.values()];
}

/**
 * Fetch and parse every kit a project borrows, so `Project.getShare` can stay synchronous.
 *
 * This is the whole reason kits work at all: a borrow resolves during analysis and during
 * evaluation, neither of which can await anything, so the fetching happens *before* the
 * Project that uses it is built. Immutability is what makes that affordable — a version is
 * cached permanently, so this is a network call once per version per device and free
 * thereafter.
 */
export async function resolveKits(
    project: Project,
    kits: KitResolver,
): Promise<Map<string, Dependency>> {
    const resolved = new Map<string, Dependency>();
    await Promise.all(
        kitsNeededBy(project).map(async ({ ref, version }) => {
            const key = dependencyKey(ref, version);
            resolved.set(key, await resolveOne(ref, version, kits));
        }),
    );
    return resolved;
}

async function resolveOne(
    ref: KitRef,
    version: number,
    kits: KitResolver,
): Promise<Dependency> {
    const kit = await kits.getByName(`${ref.username}/${ref.name}`);
    // `undefined` means we couldn't check — offline, or a refused read. Reported as
    // missing rather than left loading, because `dependenciesSettled` gates evaluation and
    // a project that could never finish loading would never run at all. It self-corrects
    // on the next load once the kit is reachable.
    if (kit === undefined || kit === null) return { status: 'missing' };

    const published = await kits.getVersion(kit.id, version);
    if (published === undefined || published === null)
        return { status: 'missing' };
    // A version that reads back unshared has been taken down. Worth saying differently
    // from "no such kit": one is a typo, the other is a decision. Only its owner and a
    // moderator ever get this far, though — the read rule refuses an unshared version to
    // anyone else, and a refused read is indistinguishable from an absent one, so a
    // stranger correctly sees "unknown kit". That is the case this branch is for: a
    // creator borrowing their own kit after it was taken down.
    if (!published.public) return { status: 'blocked' };

    return {
        status: 'loaded',
        // Parsed with the source's *own* recorded name, which carries the locale tags that
        // say what language the kit is written in.
        source: new Source(published.sourceName, published.code),
        kit: kit.id,
        version,
    };
}
