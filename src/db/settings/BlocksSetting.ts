import Setting from '@db/settings/Setting';

export const BlocksSetting = new Setting<boolean>(
    'blocks',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
