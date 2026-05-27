import Setting from '@db/settings/Setting';

export const SpaceSetting = new Setting<boolean>(
    'space',
    false,
    false,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
