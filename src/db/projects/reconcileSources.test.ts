import { describe, expect, test } from 'vitest';

import {
    reconcileSources,
    type Arrival,
    type Reconciliation,
} from '#db/projects/reconcileSources.ts';

function arrival(overrides: Partial<Arrival>): Arrival {
    return {
        from: 'cloud',
        initial: false,
        dirty: false,
        open: false,
        code: 'saved',
        age: 'newer',
        same: false,
        ...overrides,
    };
}

const Keep: Reconciliation = {
    sources: 'held',
    checkpoint: false,
    push: false,
};

describe('reconcileSources', () => {
    test.each<[string, Partial<Arrival>, Reconciliation]>([
        [
            'a newer cloud copy replaces confirmed code',
            { from: 'cloud', code: 'saved', age: 'newer' },
            { sources: 'arriving', checkpoint: false, push: false },
        ],
        [
            'a newer cloud copy never replaces code typed here',
            { from: 'cloud', code: 'typed', age: 'newer' },
            { sources: 'held', checkpoint: true, push: true },
        ],
        [
            'a newer cloud copy never replaces an edit recovered from this device',
            { from: 'cloud', code: 'adopted', age: 'newer' },
            { sources: 'held', checkpoint: true, push: true },
        ],
        ['an older cloud copy changes nothing', { age: 'older' }, Keep],
        [
            'a cloud copy of an open project is left to the live session',
            { open: true },
            Keep,
        ],
        ['identical code changes nothing', { same: true, code: 'typed' }, Keep],
        [
            'an unconfirmed row read after the cloud copy wins, and is sent',
            { from: 'device', initial: true, dirty: true, age: 'newer' },
            { sources: 'arriving', checkpoint: false, push: true },
        ],
        [
            'an unconfirmed row wins over a later cloud copy, which is remembered',
            { from: 'device', initial: true, dirty: true, age: 'older' },
            { sources: 'arriving', checkpoint: true, push: true },
        ],
        [
            'an unconfirmed row wins even when the project is already open',
            {
                from: 'device',
                initial: true,
                dirty: true,
                open: true,
                age: 'newer',
            },
            { sources: 'arriving', checkpoint: false, push: true },
        ],
        [
            'a confirmed row older than the cloud copy changes nothing',
            { from: 'device', initial: true, age: 'older' },
            Keep,
        ],
        [
            "another tab's later row is taken, and that tab sends it",
            { from: 'device', age: 'newer' },
            { sources: 'arriving', checkpoint: false, push: false },
        ],
        [
            "another tab's later row is taken again after an earlier one was",
            { from: 'device', age: 'newer', code: 'adopted', dirty: true },
            { sources: 'arriving', checkpoint: false, push: false },
        ],
        [
            "another tab's row never replaces code typed here",
            { from: 'device', age: 'newer', code: 'typed' },
            Keep,
        ],
        [
            "this tab's own earlier row changes nothing",
            { from: 'device', age: 'older', code: 'typed', dirty: true },
            Keep,
        ],
    ])('%s', (_, overrides, expected) => {
        expect(reconcileSources(arrival(overrides))).toEqual(expected);
    });

    test('unconfirmed code is replaced only by an unconfirmed row at load', () => {
        // The property the table is there to hold: whatever arrives, code the
        // cloud has not confirmed stays, unless what arrives is itself the
        // unconfirmed edit this device was holding.
        const origins: Arrival['from'][] = ['cloud', 'device'];
        const ages: Arrival['age'][] = ['newer', 'same', 'older'];
        for (const from of origins)
            for (const age of ages)
                for (const open of [true, false])
                    for (const dirty of [true, false])
                        for (const initial of [true, false]) {
                            const typed = reconcileSources(
                                arrival({
                                    from,
                                    age,
                                    open,
                                    dirty,
                                    initial,
                                    code: 'typed',
                                }),
                            );
                            expect(typed.sources).toBe('held');
                            const adopted = reconcileSources(
                                arrival({
                                    from,
                                    age,
                                    open,
                                    dirty,
                                    initial,
                                    code: 'adopted',
                                }),
                            );
                            if (adopted.sources === 'arriving')
                                expect(from).toBe('device');
                        }
    });
});
