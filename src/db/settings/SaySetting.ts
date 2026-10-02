import Setting from '#db/settings/Setting.ts';

export const SaySetting = new Setting<string | null>(
    'voice',
    true,
    null,
    (value) => (typeof value === 'string' ? value : null),
    (current, value) => current === value,
);

/** Whether the tutorial reads each new line aloud (#1015). Off by default,
 *  since it would talk over a screen reader. */
export const ReadAloudSetting = new Setting<boolean>(
    'readAloud',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);

/** In the order of the locale's `labels`/`tips`. */
export const ReadAloudRates: number[] = [0.75, 1, 1.25, 1.5];

export const ReadAloudRateIcons = ['¾', '1x', '1¼', '1½'];

/** How fast read aloud speaks: no browser lets a page read the system's rate. */
export const ReadAloudRateSetting = new Setting<number>(
    'readAloudRate',
    true,
    1,
    (value) =>
        typeof value === 'number' && ReadAloudRates.includes(value) ? value : 1,
    (current, value) => current === value,
);
