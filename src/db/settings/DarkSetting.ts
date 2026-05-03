import Setting from '@db/settings/Setting';

export const DarkSetting = new Setting<boolean | null>(
    'dark',
    true,
    null,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
