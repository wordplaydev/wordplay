import { describe, expect, test } from 'vitest';
import { classStudentRefusal, MaxClassSize } from './classStudentRefusal.js';

/** Who may add a late student to a class, decided before any account exists. */
describe('classStudentRefusal', () => {
    const classy = {
        teachers: ['t1', 't2'],
        learners: ['s1', 's2'],
    };

    test('a teacher of a password class may add a student', () => {
        expect(classStudentRefusal(classy, 't2', true)).toBeUndefined();
    });

    test.each([
        ['no caller', classy, undefined, true],
        ['no teacher claim', classy, 't1', false],
        ['a teacher of another class', classy, 'someone', true],
    ])('refuses %s', (_, data, caller, claim) => {
        expect(classStudentRefusal(data, caller, claim)).toBe('not-teacher');
    });

    test('refuses an email class', () => {
        expect(
            classStudentRefusal(
                { ...classy, affirmation: { teacher: 't1', on: 1 } },
                't1',
                true,
            ),
        ).toBe('not-password-class');
    });

    test('refuses a full class', () => {
        const full = Array.from({ length: MaxClassSize }, (_, i) => `s${i}`);
        expect(
            classStudentRefusal({ ...classy, learners: full }, 't1', true),
        ).toBe('limit');
    });

    test('refuses a missing class', () => {
        expect(classStudentRefusal(undefined, 't1', true)).toBe('failed');
    });
});
