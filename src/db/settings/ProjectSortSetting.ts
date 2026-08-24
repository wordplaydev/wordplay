import Setting from '@db/settings/Setting';

/** How the projects page orders projects. One global choice: it applies to the
 *  top level and inside every folder, so a creator never has to wonder which
 *  ordering they are looking at. */
export type ProjectSort = 'name' | 'edited';

const Sorts: readonly string[] = ['name', 'edited'];

function isSort(value: unknown): value is ProjectSort {
    return typeof value === 'string' && Sorts.includes(value);
}

/** Not device-specific: it travels with the folders it orders. */
export const ProjectSortSetting = new Setting<ProjectSort>(
    'projectSort',
    false,
    'name',
    (value) => (isSort(value) ? value : undefined),
    (current, value) => current === value,
);
