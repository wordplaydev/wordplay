import type Locales from '@locale/Locales';

/**
 * What screen readers are told as projects are organized.
 *
 * These are separate, pure functions so the thing that actually matters about
 * them can be tested: **every one has to differ from the last time it fired.**
 * A live region that gets the same string twice stays silent the second time —
 * nothing makes it speak again — so an announcement like "project moved" or
 * "folder collapsed" is heard once and then sounds broken forever. Each of
 * these names what changed (which project, which folder, how many projects,
 * which direction the folder just went) rather than summarizing the action.
 */

/** Where a project being moved would land, as the destination changes. */
export function describeDestination(
    locales: Locales,
    project: string,
    folder: string | undefined,
): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.destination, {
            project,
            folder:
                folder ??
                locales.getPrimaryPlainText(
                    (l) => l.ui.page.projects.folder.none,
                ),
        })
        .toText();
}

/** A project that just moved. Names the destination, so two moves in a row
 *  differ whenever either the project or the folder does. */
export function describeMove(
    locales: Locales,
    project: string,
    folder: string | undefined,
): string {
    return folder === undefined
        ? locales
              .concretize((l) => l.ui.page.projects.folder.announce.movedOut, {
                  project,
              })
              .toText()
        : locales
              .concretize((l) => l.ui.page.projects.folder.announce.moved, {
                  project,
                  folder,
              })
              .toText();
}

/** A folder that just opened or closed. The state word alternates on every
 *  firing, so repeatedly toggling one folder is audible each time. */
export function describeDisclosure(
    locales: Locales,
    folder: string,
    count: number,
    collapsed: boolean,
): string {
    return locales
        .concretize(
            collapsed
                ? (l) => l.ui.page.projects.folder.announce.collapsed
                : (l) => l.ui.page.projects.folder.announce.expanded,
            { folder, count },
        )
        .toText();
}

/** The project the arrow keys would now move. Names it, so choosing a second
 *  project never reads the same as choosing the first. */
export function describeProjectSelection(
    locales: Locales,
    project: string,
): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.projectSelected, {
            project,
        })
        .toText();
}

/** Nothing is chosen any more. Constant on purpose: it can only follow a
 *  different announcement, never another of itself. */
export function describeCleared(locales: Locales): string {
    return locales.getPrimaryPlainText(
        (l) => l.ui.page.projects.folder.announce.cleared,
    );
}

/** The folder the delete control now acts on. Carries the count, so moving
 *  between two folders is audible even if they were named alike. */
export function describeSelection(
    locales: Locales,
    folder: string,
    count: number,
): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.selected, {
            folder,
            count,
        })
        .toText();
}

export function describeCreation(locales: Locales, folder: string): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.created, {
            folder,
        })
        .toText();
}

export function describeRename(locales: Locales, folder: string): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.renamed, {
            folder,
        })
        .toText();
}

/** A folder that's gone, and what became of what was in it. Says "archived",
 *  not "deleted": the projects are recoverable, and a creator who hears
 *  "deleted" has no reason to look for them. */
export function describeDeletion(
    locales: Locales,
    folder: string,
    count: number,
): string {
    return locales
        .concretize((l) => l.ui.page.projects.folder.announce.deleted, {
            folder,
            count,
        })
        .toText();
}
