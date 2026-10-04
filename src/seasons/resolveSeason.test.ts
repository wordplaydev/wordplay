import { describe, expect, test } from 'vitest';
import type { Season } from './Season.ts';
import { resolveSeason } from './resolveSeason.ts';

/**
 * Auto on real places (#108): the calendar comes from each zone's own climate
 * normals, so monsoons, flipped southern years, and two rainy seasons should
 * fall where people who live there would put them. Mid-month at noon UTC, so
 * no zone's offset moves the date into another month.
 */
const at = (month: number) => new Date(Date.UTC(2026, month - 1, 15, 12));

describe('resolveSeason', () => {
    test.each<[string, number, Season]>([
        // Kolkata's monsoon, and its cool dry winter.
        ['Asia/Kolkata', 7, 'wet'],
        ['Asia/Kolkata', 1, 'winter'],
        // A temperate year, and the same year flipped in the south.
        ['Europe/London', 1, 'winter'],
        ['Europe/London', 7, 'summer'],
        ['Australia/Sydney', 1, 'summer'],
        ['Australia/Sydney', 7, 'winter'],
        // Nairobi's long rains and its dry middle of the year.
        ['Africa/Nairobi', 4, 'wet'],
        ['Africa/Nairobi', 8, 'dry'],
        // Rain all year at the equator.
        ['Asia/Singapore', 2, 'wet'],
        ['Asia/Singapore', 9, 'wet'],
        // A desert's hot and cool halves.
        ['Asia/Riyadh', 7, 'hot'],
        ['Asia/Riyadh', 1, 'cool'],
        // A mild semi-arid zone keeps the temperate calendar: Seattle reports
        // this zone, and a 19 °C October is not hot.
        ['America/Los_Angeles', 10, 'autumn'],
        ['America/Los_Angeles', 1, 'winter'],
        // A monsoon steppe's rains.
        ['Africa/Ouagadougou', 8, 'wet'],
        // The polar year.
        ['America/Nuuk', 1, 'polarNight'],
        ['America/Nuuk', 7, 'polarDay'],
    ])('%s in month %i is %s', (zone, month, season) => {
        expect(resolveSeason(at(month), zone)?.season).toBe(season);
    });

    test('a snowy continental winter is snowy', () => {
        expect(resolveSeason(at(1), 'Europe/Moscow')?.condition).toBe('snow');
    });

    test('a legacy zone name resolves to the zone it names', () => {
        expect(resolveSeason(at(7), 'Asia/Calcutta')).toEqual(
            resolveSeason(at(7), 'Asia/Kolkata'),
        );
    });

    test('a zone with its own row keeps it, even when tz links it elsewhere', () => {
        expect(resolveSeason(at(7), 'Africa/Addis_Ababa')?.zone).toBe(
            'Africa/Addis_Ababa',
        );
    });

    test('a zone that names no place resolves to nothing, so Auto shows no season', () => {
        expect(resolveSeason(at(7), 'Etc/UTC')).toBeUndefined();
        expect(resolveSeason(at(7), 'UTC')).toBeUndefined();
    });

    test('knows the country, for regional easter eggs', () => {
        expect(resolveSeason(at(7), 'Asia/Tokyo')?.region).toBe('JP');
    });
});
