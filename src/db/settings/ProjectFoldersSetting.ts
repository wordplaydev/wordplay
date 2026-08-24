import Setting from '@db/settings/Setting';

/** One folder on the projects page. Membership lives on the project doc
 *  (`Project.folder`); this is the folder itself. */
export type ProjectFolder = {
    /** What the creator called it. */
    name: string;
    /** Whether its contents are hidden. Collapsed shows previews of what's
     *  inside instead. */
    collapsed: boolean;
};

/** Folders by ID. Keyed by ID rather than by name so renaming one is a single
 *  edit here instead of a rewrite of every project it holds — and so two
 *  folders can briefly share a name while one is being renamed. */
export type ProjectFolders = Record<string, ProjectFolder>;

function isFolder(value: unknown): value is ProjectFolder {
    if (typeof value !== 'object' || value === null) return false;
    const record: Record<string, unknown> = { ...value };
    return (
        typeof record.name === 'string' && typeof record.collapsed === 'boolean'
    );
}

function validate(value: unknown): ProjectFolders | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const folders: ProjectFolders = {};
    // Drop anything malformed rather than rejecting the whole record: losing
    // one folder is recoverable, losing every folder is not, and a project
    // whose folder disappears falls back to the top level rather than
    // vanishing (see resolveFolders).
    for (const [id, folder] of Object.entries(value))
        if (isFolder(folder)) folders[id] = folder;
    return folders;
}

/** The creator's project folders. Not device-specific: filing your projects is
 *  organization you expect to find again on another device, so this rides along
 *  in the creator's settings document. */
export const ProjectFoldersSetting = new Setting<ProjectFolders>(
    'projectFolders',
    false,
    {},
    validate,
    (current, value) => JSON.stringify(current) === JSON.stringify(value),
);
