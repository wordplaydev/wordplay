import Setting from '@db/settings/Setting';

export const CameraSetting = new Setting<string | null>(
    'camera',
    true,
    null,
    (value) => (typeof value === 'string' ? value : null),
    (current, value) => current == value,
);
