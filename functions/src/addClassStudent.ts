import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    AddClassStudentInputs,
    AddClassStudentOutput,
} from 'shared-types';
import { hasClaim } from './claims.js';
import { readRoster } from './classRoster.js';
import { classStudentRefusal } from './classStudentRefusal.js';
import { mintAccounts, undoAccounts } from './mintAccounts.js';
import { isRecord } from './shared/guards.js';

/**
 * Create one student account in an existing password class, for a student who
 * arrives after the class was made. Before this, a teacher's only way was to
 * sign up as the student in a private window and then add the account.
 *
 * No attempt key, unlike `createClass`: the class page listens to the class, so
 * a retry after a lost response shows the student already there.
 *
 * NOTHING IN `request.data` MAY BE LOGGED: it carries a password.
 */
export default async function addClassStudent(
    request: CallableRequest<AddClassStudentInputs>,
): Promise<AddClassStudentOutput> {
    const db = getFirestore();
    const { classid, username, password } = request.data;
    if (typeof classid !== 'string' || classid === '' || classid.includes('/'))
        return { error: 'failed' };

    const classRef = db.collection('classes').doc(classid);
    const classy = (await classRef.get().catch(() => undefined))?.data();
    const refusal = classStudentRefusal(
        classy,
        request.auth?.uid,
        hasClaim(request.auth?.token, 'teacher'),
    );
    if (refusal !== undefined) return { error: refusal };

    const reading = readRoster(
        [{ username, meta: [], password }],
        'password',
        false,
    );
    const student = 'problem' in reading ? undefined : reading.students[0];
    if (student === undefined) return { error: 'invalid' };

    // A synthesized address with an account means the name is someone's.
    const existing = await getAuth()
        .getUserByEmail(student.address)
        .catch(() => undefined);
    if (existing !== undefined) return { error: 'taken' };

    const minted = await mintAccounts([student], 'password');
    if ('failure' in minted)
        return { error: minted.failure === 'taken' ? 'taken' : 'failed' };
    const made = minted.made[0];
    if (made === undefined) return { error: 'failed' };

    // Match the class's meta columns so the row aligns with the others.
    const info =
        isRecord(classy) && Array.isArray(classy.info) ? classy.info : [];
    const first: unknown = info[0];
    const width =
        isRecord(first) && Array.isArray(first.meta) ? first.meta.length : 0;
    const galleries =
        isRecord(classy) && Array.isArray(classy.galleries)
            ? classy.galleries.filter((g) => typeof g === 'string')
            : [];

    try {
        const batch = db.batch();
        batch.update(classRef, {
            learners: FieldValue.arrayUnion(made.uid),
            info: FieldValue.arrayUnion({
                uid: made.uid,
                username: made.username,
                meta: new Array(width).fill(''),
            }),
        });
        for (const gallery of galleries)
            batch.update(db.collection('galleries').doc(gallery), {
                creators: FieldValue.arrayUnion(made.uid),
            });
        await batch.commit();
    } catch (error) {
        console.error('Could not add a student to a class', error);
        await undoAccounts([made]);
        return { error: 'failed' };
    }

    return { username: made.username };
}
