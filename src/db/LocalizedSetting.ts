import Setting from './Setting';

export const LocalizedSetting = new Setting<boolean>(
    'localized',
    true,
    false,
    () => true,
    (current, value) => current === value
);
