import Setting from './Setting';

export const SaySetting = new Setting<string | null>(
    'voice',
    true,
    null,
    (value) => (typeof value === 'string' ? value : null),
    (current, value) => current === value,
);
