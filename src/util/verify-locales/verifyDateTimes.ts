import fs from 'fs';
import path from 'path';
import { CLDR_VERSION } from '@util/verify-locales/cldr';
import {
    coreOf,
    dateTimesPathFor,
    readDateTimesFor,
    rebuildDateTimesCore,
    writeDateTimesForLocale,
    writeTimeZones,
} from '@util/verify-locales/generateDateTimes';
import type Log from '@util/verify-locales/Log';
import Validator from '@util/verify-locales/Validator';

// Compile the DateTimeData schema (generated from the type by
// `npm run datetime-schema`) so committed data files are shape-checked.
const DateTimeSchema = JSON.parse(
    fs.readFileSync('static/schemas/DateTimeData.json', 'utf8'),
);
export const DateTimeValidator = Validator.compile(DateTimeSchema);

/** The locale's entry in the bundled core data file, if any. */
function coreEntryFor(locale: string): unknown {
    try {
        const core: unknown = JSON.parse(
            fs.readFileSync(
                path.join('src', 'locale', 'datetimes-core.json'),
                'utf8',
            ),
        );
        return typeof core === 'object' && core !== null
            ? Reflect.get(core, locale)
            : undefined;
    } catch (_) {
        return undefined;
    }
}

/** Problems with the global canonical time zone list (checked once, during the
 *  en-US pass): it must exist, be non-empty, and carry the pinned CLDR version. */
function timeZoneProblems(): string[] {
    const file = path.join('src', 'locale', 'timezones.json');
    let data: unknown;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
        return [`Missing or unreadable ${file}; run "npm run datetimes".`];
    }
    if (
        typeof data !== 'object' ||
        data === null ||
        !('zones' in data) ||
        !Array.isArray(data.zones) ||
        data.zones.length === 0 ||
        !data.zones.every((zone) => typeof zone === 'string')
    )
        return [`${file} is malformed; run "npm run datetimes".`];
    if (!('cldr' in data) || data.cldr !== CLDR_VERSION)
        return [
            `${file} was generated from CLDR ${'cldr' in data ? String(data.cldr) : 'unknown'} but the generator pins ${CLDR_VERSION}; run "npm run datetimes".`,
        ];
    return [];
}

/** All problems with a locale's committed date/time data. Everything here is
 *  checkable offline: the data must exist, match the schema, carry the pinned
 *  CLDR version, and agree with the bundled core slice derived from it. */
function dateTimeProblems(locale: string): string[] {
    const file = dateTimesPathFor(locale);
    const data = readDateTimesFor(locale);
    if (data === undefined)
        return [
            `Missing or unreadable date/time data ${file}; run "npm run datetimes ${locale}".`,
        ];
    if (!DateTimeValidator(data)) {
        const problems = [`${file} doesn't match the DateTimeData schema:`];
        for (const error of DateTimeValidator.errors ?? [])
            if (error.message)
                problems.push(`  ${error.instancePath}: ${error.message}`);
        return problems;
    }
    const problems: string[] = [];
    if (data.cldr !== CLDR_VERSION)
        problems.push(
            `${file} was generated from CLDR ${data.cldr ?? 'unknown'} but the generator pins ${CLDR_VERSION}; run "npm run datetimes ${locale}".`,
        );
    // The bundled core (en-US excluded) must be exactly the derived slice of
    // the full file, so `→ ''/language` targets can't drift from loaded data.
    if (
        locale !== 'en-US' &&
        JSON.stringify(coreEntryFor(locale)) !== JSON.stringify(coreOf(data))
    )
        problems.push(
            `src/locale/datetimes-core.json is out of sync with ${file}; run "npm run datetimes".`,
        );
    return problems;
}

/**
 * Verify this locale's date/time formatting data. When `repair` is set (fix
 * runs, and translate/override runs that include the `datetimes` category),
 * problems are repaired by regenerating from the pinned CLDR release —
 * generation is deterministic (see generateDateTimes.ts), so a repair can
 * never introduce drift. Network failure keeps existing data with a warning,
 * mirroring emoji generation.
 */
export default async function verifyDateTimes(
    log: Log,
    locale: string,
    repair: boolean,
): Promise<void> {
    // The canonical zone list is global; check it once, alongside en-US.
    let problems =
        locale === 'en-US'
            ? [...timeZoneProblems(), ...dateTimeProblems(locale)]
            : dateTimeProblems(locale);
    if (problems.length > 0 && repair) {
        log.say(
            2,
            `Regenerating date/time data for ${locale} from CLDR ${CLDR_VERSION}…`,
        );
        try {
            await writeDateTimesForLocale(locale);
            await rebuildDateTimesCore();
            if (locale === 'en-US') await writeTimeZones();
            problems =
                locale === 'en-US'
                    ? [...timeZoneProblems(), ...dateTimeProblems(locale)]
                    : dateTimeProblems(locale);
        } catch (error) {
            log.warning(
                2,
                `Date/time regeneration for ${locale} failed (${error}); keeping any existing data. Re-run "npm run datetimes ${locale}" later.`,
            );
        }
    }
    if (problems.length === 0)
        log.good(2, `Date/time data matches CLDR ${CLDR_VERSION}.`);
    else for (const problem of problems) log.bad(2, problem);
}
