import type Project from '@db/projects/Project';
import type { ProjectFolders } from '@db/settings/ProjectFoldersSetting';
import type { ProjectSort } from '@db/settings/ProjectSortSetting';
import sortProjects from '@db/projects/sortProjects';

/** A folder and the projects filed under it, ready to render. */
export type ResolvedFolder = {
    id: string;
    name: string;
    collapsed: boolean;
    projects: Project[];
};

export type ResolvedFolders = {
    /** The creator's folders, in the current sort order, each with its contents. */
    folders: ResolvedFolder[];
    /** Projects that aren't in any folder. */
    loose: Project[];
};

/** What a project not in any folder is filed under. Also the first destination
 *  offered when moving one, so "take it out of this folder" is always reachable. */
export const NoFolder = null;

/**
 * Group projects into their folders.
 *
 * A project whose folder ID isn't in `folders` falls back to the top level
 * rather than disappearing. That happens whenever the project doc has synced
 * but the settings document holding the folder hasn't yet — the two halves of
 * a folder live in different documents, so they can arrive in either order,
 * and showing the project unfiled is far better than hiding a creator's work
 * until the other half turns up.
 */
export function resolveFolders(
    projects: Project[],
    folders: ProjectFolders,
    sort: ProjectSort,
    languages: string[],
): ResolvedFolders {
    const byFolder = new Map<string, Project[]>();
    const loose: Project[] = [];

    for (const project of projects) {
        const folder = project.getFolder();
        if (folder === null || !(folder in folders)) loose.push(project);
        else byFolder.set(folder, [...(byFolder.get(folder) ?? []), project]);
    }

    // Folders are ordered by name regardless of the project sort: "recently
    // edited" is a property of a project, and a folder doesn't have one.
    const resolved = Object.entries(folders)
        .map(([id, folder]) => ({
            id,
            name: folder.name,
            collapsed: folder.collapsed,
            projects: sortProjects(byFolder.get(id) ?? [], sort, languages),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, languages));

    return { folders: resolved, loose: sortProjects(loose, sort, languages) };
}

/**
 * A folder name that isn't taken yet, based on `base`.
 *
 * Two folders sharing a name isn't an error — they have distinct IDs, and a
 * creator renaming one shouldn't be blocked mid-edit — but handing out the
 * same default name twice makes the new folder look like it failed to appear.
 */
export function nextFolderName(folders: ProjectFolders, base: string): string {
    const taken = new Set(Object.values(folders).map((folder) => folder.name));
    if (!taken.has(base)) return base;
    let count = 2;
    while (taken.has(`${base} ${count}`)) count++;
    return `${base} ${count}`;
}

/**
 * Where a project can be moved, in the order they appear on the page.
 *
 * Folders first, then the top level, because that is the order the page draws
 * them — the folders, and then everything not in one. The arrow keys walk this
 * list, so it has to match what someone is looking at: pressing down on a
 * project below a folder used to move it *up* into that folder.
 */
export function moveDestinations(folders: ResolvedFolder[]): (string | null)[] {
    return [...folders.map((folder) => folder.id), NoFolder];
}

/**
 * The destination one step from `current` in the direction `key` moves.
 *
 * Wraps around, and returns `current` unchanged for a key that isn't a
 * horizontal arrow, so a caller can use the result to decide whether the
 * keystroke was theirs to consume.
 */
export function nextDestination(
    destinations: (string | null)[],
    current: string | null,
    key: 'ArrowLeft' | 'ArrowRight',
    rtl: boolean,
): string | null {
    if (destinations.length === 0) return current;
    const forward = rtl ? key === 'ArrowLeft' : key === 'ArrowRight';
    const index = destinations.indexOf(current);
    // An unknown current destination (its folder was deleted mid-move) steps to
    // the top level rather than off the end of the list.
    if (index === -1) return destinations[0] ?? NoFolder;
    const next =
        (index + (forward ? 1 : -1) + destinations.length) %
        destinations.length;
    return destinations[next] ?? NoFolder;
}
