import type Project from '@db/projects/Project';
import type { ProjectSort } from '@db/settings/ProjectSortSetting';

/**
 * Order projects by the creator's one global choice.
 *
 * Lifted out of ProjectPreviewSet, which used to sort alphabetically on its
 * own: with folders there are several sets on the page and they all have to
 * agree, so the ordering is decided once by the page and handed down.
 *
 * Both orders tie-break by name, so the result is stable rather than dependent
 * on whatever order the database happened to hand us — two projects saved in
 * the same millisecond would otherwise swap places between renders.
 */
export default function sortProjects(
    projects: Project[],
    sort: ProjectSort,
    languages: string[],
): Project[] {
    const byName = (a: Project, b: Project) =>
        a.getName().localeCompare(b.getName(), languages);
    return [...projects].sort(
        sort === 'edited'
            ? (a, b) => b.getTimestamp() - a.getTimestamp() || byName(a, b)
            : byName,
    );
}
