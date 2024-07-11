import Setting from './Setting';

export const LineSetting = new Setting<boolean>(
    'lines',
    false,
    true,
    (value) => typeof value === 'boolean',
    (current, value) => current === value,
);
