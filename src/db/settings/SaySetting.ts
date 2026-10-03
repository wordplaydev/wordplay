import Setting from '#db/settings/Setting.ts';
import {
    isVerbosity,
    Verbosities,
    type Verbosity,
} from '#edit/describe/Verbosity.ts';

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

/** In the order of the locale's `labels`/`tips`. */
export const AnnouncementVerbosities: readonly Verbosity[] = Verbosities;

export const AnnouncementVerbosityIcons = ['·', '··', '···'];

/** How much the editor tells a screen reader about the caret and each edit
 *  (see Verbosity.ts). Device-local, like `readAloudRate`: it is tuned to the
 *  screen reader on this machine, and a creator's VoiceOver laptop and NVDA
 *  Chromebook want different amounts. Kept in this file rather than one of its
 *  own for the reason the read-aloud settings are: a settings file lands on
 *  every page's import graph. */
export const AnnouncementVerbositySetting = new Setting<Verbosity>(
    'announcementVerbosity',
    true,
    'normal',
    (value) => (isVerbosity(value) ? value : undefined),
    (current, value) => current === value,
);
