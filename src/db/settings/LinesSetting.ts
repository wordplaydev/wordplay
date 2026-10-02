import Setting from '#db/settings/Setting.ts';

export const LineSetting = new Setting<boolean>(
    'lines',
    false,
    true,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
