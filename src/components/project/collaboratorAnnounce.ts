import type Locales from '@locale/Locales';
import type { ProjectPrivilege } from '@db/projects/Project';

/**
 * What the announcer says when a project's people change.
 *
 * Pure and separate from the component so the rule these have to obey can be
 * tested: an announcement that reads identically two firings running is heard
 * once and then sounds broken. Both name the person, and the privilege one
 * names the privilege, so consecutive changes always differ.
 */

/** "$name can now comment" — the privilege words are verbs for this reason. */
export function privilegeAnnouncement(
    locales: Locales,
    name: string,
    privilege: ProjectPrivilege,
): string {
    return locales
        .concretize((l) => l.ui.collaborate.announce.privilege, {
            name,
            privilege: locales.getPrimaryPlainText(
                (l) => l.ui.collaborate.role[privilege],
            ),
        })
        .toText();
}

/** Said when someone is taken off the project entirely. */
export function removalAnnouncement(locales: Locales, name: string): string {
    return locales
        .concretize((l) => l.ui.collaborate.announce.removed, { name })
        .toText();
}
