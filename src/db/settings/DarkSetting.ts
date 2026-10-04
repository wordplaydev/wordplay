import Setting from '#db/settings/Setting.ts';
import { isSeasonChoice, type SeasonChoice } from '#seasons/Season.ts';

export const DarkSetting = new Setting<boolean | null>(
    'dark',
    true,
    null,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);

/**
 * Which season the app dresses in (#108): `'auto'` follows the device's place
 * and month, `'none'` is classic Wordplay, or any season by name. Device-local
 * like `dark`, because the right season depends on where the device is, not
 * who is signed in. Lives here rather than its own file to keep the settings
 * graph every page carries from growing by a file.
 */
export const SeasonSetting = new Setting<SeasonChoice>(
    'season',
    true,
    'auto',
    (value) => (isSeasonChoice(value) ? value : undefined),
    (current, value) => current === value,
);
