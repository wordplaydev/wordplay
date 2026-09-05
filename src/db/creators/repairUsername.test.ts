import { describe, expect, test } from 'vitest';
import {
    isValidUsername,
    repairUsername,
} from '../../../functions/src/username';

/**
 * The repair keeps only what a name may contain, because the reserved
 * characters *are* the problem. These are the twenty real production names the
 * audit found, so a change to either the rule or the repair shows up here as a
 * different verdict on real people rather than on invented examples.
 */
const Production = [
    'test-123',
    'wd041216-bit',
    'tea_차',
    'peng.kuang',
    'mr.tangy',
    'kash$',
    'lost&found',
    '103111',
    'ndo-uw',
    'burgundy_frog',
    '73334890',
    'yiqianna_h',
    'n_zah',
    'stef-zjw',
    'l_1l_1',
    '76hjpace',
    'vcxxra_',
    'car.reese',
    'nora.c.g',
    'awe_srush',
];

describe('repairing a name', () => {
    test.each([
        ['peng.kuang', 'pengkuang'],
        ['lost&found', 'lostfound'],
        ['burgundy_frog', 'burgundyfrog'],
        ['test-123', 'test123'],
    ])('%s becomes %s', (from, to) => {
        expect(repairUsername(from)).toBe(to);
    });

    test('a name that is already fine is unchanged', () => {
        // The script never calls it for these, but a repair that mangled a
        // valid name would be worse than one that did nothing.
        for (const name of ['alice', 'мария', '76hjpace'])
            expect(repairUsername(name)).toBe(name);
    });
});

describe('the production set', () => {
    test('three of the twenty are already claimable', () => {
        // The digit-leading ones. They lex, and one owns three characters that
        // resolve today — which is why the leading-letter rule was dropped
        // rather than these accounts renamed.
        const fine = Production.filter((n) => isValidUsername(n));
        expect(fine.toSorted()).toEqual(['103111', '73334890', '76hjpace']);
    });

    test('thirteen repair cleanly and four do not', () => {
        const broken = Production.filter((n) => !isValidUsername(n));
        const repairable = broken.filter((n) =>
            isValidUsername(repairUsername(n)),
        );
        expect(broken).toHaveLength(17);
        expect(repairable).toHaveLength(13);
    });

    test('the four that resist are the short ones and the mixed-script one', () => {
        const stuck = Production.filter(
            (n) => !isValidUsername(n) && !isValidUsername(repairUsername(n)),
        );
        expect(stuck.toSorted()).toEqual([
            'kash$',
            'l_1l_1',
            'n_zah',
            'tea_차',
        ]);
    });

    test('no repair collides with another name in the set', () => {
        // Two creators must never be repaired onto one name. The script also
        // checks the live reservation, but a collision inside the set itself
        // would mean the plan was wrong before it ever ran.
        const repaired = Production.filter((n) => !isValidUsername(n))
            .map(repairUsername)
            .filter(isValidUsername);
        expect(new Set(repaired).size).toBe(repaired.length);
    });

    test('every repaired name is claimable, which is the whole point', () => {
        for (const name of Production) {
            if (isValidUsername(name)) continue;
            const repaired = repairUsername(name);
            if (isValidUsername(repaired)) expect(repaired).not.toBe(name);
        }
    });
});
