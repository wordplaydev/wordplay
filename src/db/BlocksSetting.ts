import Setting from './Setting';

export const BlocksSetting = new Setting<boolean>(
    'blocks',
    true,
    false,
    () => true,
    (current, value) => current === value
);
