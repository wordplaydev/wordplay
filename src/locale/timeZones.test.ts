import { expect, test } from 'vitest';
import { registerDateTimeData } from '@locale/dateTimeData';
import type Locale from '@locale/Locale';
import {
    cityFromID,
    isSupportedTimeZone,
    suggestTimeZones,
    SupportedTimeZones,
} from '@locale/timeZones';

const English: Locale = { language: 'en', regions: ['US'] };
const Spanish: Locale = { language: 'es', regions: ['MX'] };

test('The canonical zone list is present and well-formed', () => {
    expect(SupportedTimeZones.length).toBeGreaterThan(400);
    expect(isSupportedTimeZone('America/Los_Angeles')).toBe(true);
    expect(isSupportedTimeZone('Asia/Tokyo')).toBe(true);
    expect(isSupportedTimeZone('Etc/Unknown')).toBe(false);
    expect(isSupportedTimeZone('Mars/Olympus')).toBe(false);
});

test('Cities derive from zone ids', () => {
    expect(cityFromID('America/New_York')).toBe('New York');
    expect(cityFromID('Asia/Tokyo')).toBe('Tokyo');
    expect(cityFromID('America/Argentina/Rio_Gallegos')).toBe('Rio Gallegos');
});

test('City names suggest their zones', () => {
    expect(suggestTimeZones('tokyo', [English])[0]?.zone).toBe('Asia/Tokyo');
    expect(suggestTimeZones('New York', [English])[0]?.zone).toBe(
        'America/New_York',
    );
    // A close-but-wrong id (space for underscore) still resolves.
    expect(suggestTimeZones('America/New York', [English])[0]?.zone).toBe(
        'America/New_York',
    );
    // A typo'd city resolves too.
    expect(suggestTimeZones('tokio', [English])[0]?.zone).toBe('Asia/Tokyo');
});

test('Localized city names match when locale data is registered', () => {
    registerDateTimeData('es-MX', {
        calendar: 'gregory',
        hourCycle: 'h12',
        time: [{ f: 'hour' }],
        calendars: {},
        zones: { 'America/Los_Angeles': 'Los Ángeles' },
    });
    const suggestions = suggestTimeZones('los ángeles', [Spanish]);
    expect(suggestions[0]?.zone).toBe('America/Los_Angeles');
    expect(suggestions[0]?.city).toBe('Los Ángeles');
});

test('Suggestions are bounded and deterministic', () => {
    expect(suggestTimeZones('xqzzt', [English])).toHaveLength(0);
    expect(suggestTimeZones('', [English])).toHaveLength(0);
    const first = suggestTimeZones('paris', [English]);
    expect(first).toEqual(suggestTimeZones('paris', [English]));
    expect(first.length).toBeLessThanOrEqual(3);
    expect(first[0]?.zone).toBe('Europe/Paris');
});
