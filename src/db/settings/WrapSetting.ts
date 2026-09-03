import Setting from '@db/settings/Setting';

/** When true, long lines in the editor's text mode soft-wrap to the editor width
 *  instead of overflowing horizontally. Defaults to true.
 *
 *  Account-synced, unlike device-local `blocks`: it carries a `SettingsSchema`
 *  field, a branch in the remote-config load, and a `toObject` entry, which is
 *  what syncing takes. (This comment previously claimed the opposite.) */
export const WrapSetting = new Setting<boolean>(
    'wrap',
    false,
    true,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
