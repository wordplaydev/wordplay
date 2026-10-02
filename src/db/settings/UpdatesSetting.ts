import Setting from '#db/settings/Setting.ts';

/** The timestamp of the last update page check */
export const UpdatesSetting = new Setting<string | null>(
    'updates',
    true,
    null,
    (value) =>
        value === null || typeof value === 'string' ? value : undefined,
    (current, value) => current === value,
);
