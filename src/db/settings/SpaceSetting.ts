import Setting from './Setting';

export const SpaceSetting = new Setting<boolean>(
    'space',
    false,
    true,
    (value) => typeof value === 'boolean',
    (current, value) => current === value
);
