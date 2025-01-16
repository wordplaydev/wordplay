import Setting from './Setting';

export const DarkSetting = new Setting<boolean | null>(
    'dark',
    true,
    null,
    (value) => typeof value === 'boolean' || value === null,
    (current, value) => current === value,
);
