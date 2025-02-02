import Setting from './Setting';

export const MicSetting = new Setting<string | null>(
    'mic',
    true,
    null,
    (value) => (typeof value === 'string' ? value : null),
    (current, value) => current == value
);
