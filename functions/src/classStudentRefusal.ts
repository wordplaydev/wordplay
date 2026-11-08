import type { AddClassStudentError } from 'shared-types';
import { isRecord, isStringArray } from './shared/guards.js';

/** The most students a class may hold, the same cap `createClass` puts on a
 *  roster. */
export const MaxClassSize = 50;

/**
 * Why a caller may not add a student to this class, or undefined if they may.
 * A leaf module so it can be tested without firebase-admin.
 *
 * Only a password class: an email class's teacher affirmed they may bind
 * students' addresses at creation, and a student with an address can make their
 * own account, which the class page already adds.
 */
export function classStudentRefusal(
    classy: unknown,
    caller: string | undefined,
    isTeacher: boolean,
): AddClassStudentError | undefined {
    if (caller === undefined || !isTeacher) return 'not-teacher';
    if (!isRecord(classy)) return 'failed';
    const { teachers, learners, affirmation } = classy;
    if (!isStringArray(teachers) || !teachers.includes(caller))
        return 'not-teacher';
    if (affirmation !== undefined) return 'not-password-class';
    if (!isStringArray(learners)) return 'failed';
    if (learners.length >= MaxClassSize) return 'limit';
    return undefined;
}
