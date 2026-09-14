import { describe, expect, test } from 'vitest';
import { isReservation, type Reservation } from './handles.js';
import { reservationAction } from './sweepReservations.js';

const Hour = 60 * 60 * 1000;
const NOW = Date.parse('2026-09-04T00:00:00Z');

function reservation(over: Partial<Reservation> = {}): Reservation {
    return { v: 1, uid: 'u1', username: 'alice', claimed: NOW, ...over };
}

describe('deciding what to do with a reservation', () => {
    test('a live reservation is checked against its account', () => {
        expect(reservationAction(reservation(), NOW)).toBe('check');
    });

    test('a tombstone is left alone', () => {
        // A retired name is never re-issued: `@username/Character` is a language
        // token, and handing the name to someone else would silently re-point
        // live references in anyone's project at a stranger's work.
        expect(
            reservationAction(
                reservation({ uid: null, retiredAt: NOW - Hour }),
                NOW,
            ),
        ).toBe('keep');
    });

    test('a hold still inside the grace period is left alone', () => {
        // An account creation in flight. Sweeping this would take the name out
        // from under someone mid-signup.
        expect(
            reservationAction(
                reservation({ uid: null, claimed: NOW - Hour / 2 }),
                NOW,
            ),
        ).toBe('keep');
    });

    test('a hold past the grace period is released, not retired', () => {
        // Nothing was ever named this — creation died before assignUsername —
        // so no reference can point at it, and holding it forever would punish
        // a creator for our own crash.
        expect(
            reservationAction(
                reservation({ uid: null, claimed: NOW - 2 * Hour }),
                NOW,
            ),
        ).toBe('release');
    });

    test('the boundary is inclusive of the grace period', () => {
        expect(
            reservationAction(
                reservation({ uid: null, claimed: NOW - Hour }),
                NOW,
            ),
        ).toBe('release');
    });

    test('a tombstone is never released, however old', () => {
        // The two null-uid cases are told apart by retiredAt alone, and getting
        // that backwards would re-issue every deleted creator's name.
        expect(
            reservationAction(
                reservation({
                    uid: null,
                    claimed: NOW - 10_000 * Hour,
                    retiredAt: NOW - 9_000 * Hour,
                }),
                NOW,
            ),
        ).toBe('keep');
    });
});

/**
 * The sweep deletes and tombstones, so what it cannot read it must not act on.
 * `isReservation` is the whole gate: a document of an unknown shape falls
 * through to 'keep' rather than being measured against a policy written for a
 * shape it does not have. The same guard is what `changeUsername` asks before
 * renaming onto an existing name.
 */
describe('refusing a reservation the sweep cannot read', () => {
    test('a document of the right shape is read', () => {
        expect(isReservation(reservation())).toBe(true);
        expect(isReservation(reservation({ uid: null, retiredAt: NOW }))).toBe(
            true,
        );
    });

    test('a document missing any required field is refused', () => {
        expect(isReservation({ v: 1, uid: 'u1', username: 'alice' })).toBe(
            false,
        );
        expect(isReservation({ v: 1, uid: 'u1', claimed: NOW })).toBe(false);
        expect(isReservation({ v: 1, username: 'alice', claimed: NOW })).toBe(
            false,
        );
    });

    test('a document of a future version is refused rather than guessed at', () => {
        expect(isReservation({ ...reservation(), v: 2 })).toBe(false);
    });

    test('a field of the wrong type is refused', () => {
        expect(isReservation({ ...reservation(), claimed: '2026' })).toBe(
            false,
        );
        expect(isReservation({ ...reservation(), uid: 42 })).toBe(false);
        expect(
            isReservation({ ...reservation(), retiredAt: 'yesterday' }),
        ).toBe(false);
    });

    test('nothing at all is refused', () => {
        expect(isReservation(undefined)).toBe(false);
        expect(isReservation(null)).toBe(false);
        expect(isReservation([])).toBe(false);
        expect(isReservation('alice')).toBe(false);
    });
});
