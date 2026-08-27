import Setting from '@db/settings/Setting';

/**
 * Whether to adapt bright program output to a dark canvas when the app is in
 * dark mode. Device-local like `DarkSetting`, because how bright a screen
 * should be is a fact about the room someone is sitting in, not about who
 * they are.
 */
export const AdaptOutputSetting = new Setting<boolean>(
    'adaptOutput',
    true,
    true,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
