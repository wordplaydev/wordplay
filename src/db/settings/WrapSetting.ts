import Setting from '@db/settings/Setting';

/** When true, long lines in the editor's text mode soft-wrap to the editor width
 *  instead of overflowing horizontally. Device-local, like the other editor
 *  display preferences. Defaults to true. */
export const WrapSetting = new Setting<boolean>(
    'wrap',
    false,
    true,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
