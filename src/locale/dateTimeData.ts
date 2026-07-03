import coreDateTimes from '@locale/datetimes-core.json';
import {
    type DateTimeData,
} from '@locale/dateTimeFormats';
import enUSDateTimes from '@locale/en-US-datetimes.json';
import type Locale from '@locale/Locale';
import { getLocaleLanguage } from '@locale/LocaleText';

/**
 * The registry of per-locale date/time formatting data used by Moment's
 * localized text conversion. Kept separate from dateTimeFormats.ts (the pure
 * formatting logic and types) so the generation script (`npm run datetimes`)
 * can import that module before these generated JSON files exist.
 */

/** A shallow shape check for loaded data files; fetched JSON is untrusted. */
function isDateTimeData(value: unknown): value is DateTimeData {
    return (
        typeof value === 'object' &&
        value !== null &&
        'calendar' in value &&
        'hourCycle' in value &&
        'time' in value &&
        Array.isArray(value.time) &&
        'calendars' in value &&
        typeof value.calendars === 'object'
    );
}

/** The bundled en-US data, the universal fallback (mirroring DefaultLocale). */
const DefaultDateTimeData: DateTimeData = isDateTimeData(enUSDateTimes)
    ? enUSDateTimes
    : {
          calendar: 'gregory',
          hourCycle: 'h23',
          time: [
              { f: 'hour', p: true },
              { l: ':' },
              { f: 'minute', p: true },
              { l: ':' },
              { f: 'second', p: true },
          ],
          calendars: {},
      };

/** Loaded data by supported locale name (e.g. 'ja-JP'). Seeded with every
 *  locale's bundled "core" data (patterns + default calendar, ~3KB total), so
 *  `→ ''/language` targets work even for locales the reader hasn't selected;
 *  LocalesDatabase overwrites entries with full data (all calendars) as each
 *  selected locale's companion datetimes file loads. */
const dateTimesByLocale = new Map<string, DateTimeData>([
    ['en-US', DefaultDateTimeData],
]);
for (const [name, data] of Object.entries(coreDateTimes))
    if (isDateTimeData(data)) dateTimesByLocale.set(name, data);

/** Register a fetched datetimes file, ignoring anything malformed. */
export function registerDateTimeData(localeName: string, data: unknown): void {
    if (isDateTimeData(data)) dateTimesByLocale.set(localeName, data);
}

/** The formatting data for a locale: exact language+region match first, then
 *  any registered locale of the same language, then the bundled en-US data. */
export function getDateTimeDataForLocale(locale: Locale): DateTimeData {
    const region = locale.regions[0];
    if (region !== undefined) {
        const exact = dateTimesByLocale.get(`${locale.language}-${region}`);
        if (exact) return exact;
    }
    for (const [name, data] of dateTimesByLocale)
        if (getLocaleLanguage(name) === locale.language) return data;
    return DefaultDateTimeData;
}
