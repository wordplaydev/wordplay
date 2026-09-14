import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { CreateClassInputs, CreateClassOutput } from 'shared-types';
import { claimCreation, creationRef } from './classCreation.js';
import {
    isCreationKey,
    readRoster,
    type RosterStudent,
} from './classRoster.js';
import { hasClaim } from './claims.js';
import {
    assignUsername,
    getHandles,
    releaseReservation,
    reserveUsername,
    unassignUsername,
} from './handles.js';
import { usernameFromEmail } from './username.js';

/**
 * Create a class, and the student accounts it needs (#1347).
 *
 * NOTHING IN `request.data` MAY BE LOGGED: a roster is up to fifty passwords,
 * and the joinAccount rule applies here for fifty times the reason.
 */

/** What one student ended up with, alongside what the class document needs. */
type Placed = {
    uid: string;
    username: string;
    existed: boolean;
    meta: string[];
};

function fail(
    kind: 'account' | 'limit' | 'affirmation' | 'inflight' | 'generic',
    info: string,
): CreateClassOutput {
    return { classid: undefined, error: { kind, info } };
}

export default async function createClass(
    request: CallableRequest<CreateClassInputs>,
): Promise<CreateClassOutput> {
    const auth = getAuth();
    const db = getFirestore();
    const {
        teacher,
        name,
        description,
        students,
        existing,
        method,
        affirmed,
        key,
    } = request.data;

    // Make sure there aren't too many students.
    if (Array.isArray(students) && students.length > 50)
        return fail('limit', '');

    // This endpoint creates up to 50 accounts per call and, until #1299,
    // checked nothing about who was calling it: any signed-in caller could pass
    // any existing teacher's uid. That is account minting with a bulk discount.
    // The claim half admits a superuser too (`admin` implies `teacher`); the
    // "and only their own" half deliberately does not, since that is what keeps
    // this from minting fifty accounts on someone else's behalf.
    if (
        request.auth?.uid !== teacher ||
        !hasClaim(request.auth.token, 'teacher')
    )
        return fail(
            'generic',
            'Only a teacher may create a class, and only their own',
        );

    // Ensure the teacher is a valid user ID.
    try {
        await auth.getUser(teacher);
    } catch (error) {
        console.error(JSON.stringify(error));
        return fail('generic', "The teacher user id provided doesn't exist");
    }

    if (!Array.isArray(existing))
        return fail('generic', 'expected a list of existing student ids');

    // Read the roster before anything is created, so a name that cannot be
    // claimed costs nothing rather than a partial round of reservations.
    const reading = readRoster(students, method, affirmed);
    if ('problem' in reading)
        return fail(reading.problem.kind, reading.problem.info);
    const roster = reading.students;
    // One answer for the whole class, which is what the four branches below
    // read instead of asking each student.
    const signin = reading.method;

    // A retry needs to name the same attempt, and a document id taken from
    // client input has to be constrained or a `/` in it walks out of the
    // collection.
    if (!isCreationKey(key))
        return fail('generic', 'expected an attempt key for this class');

    // Ensure each existing user is a valid user ID, and learn what they are
    // called. Their *handle*, never their address: the class document is read
    // by every member, and this field used to hold `user.email` verbatim.
    const existingUsers = new Map<string, UserRecord>();
    for (const uid of existing) {
        try {
            existingUsers.set(uid, await auth.getUser(uid));
        } catch (error) {
            console.error(JSON.stringify(error));
            return fail(
                'generic',
                "One of the existing user ids provided doesn't exist",
            );
        }
    }

    // Which addresses already have accounts. An address the teacher supplied is
    // adopted — a student who already uses Wordplay joins the class rather than
    // failing it — while a synthesized one means the *username* belongs to
    // someone, which is a roster to fix rather than an account to reuse.
    let found;
    try {
        found = await auth.getUsers(roster.map((s) => ({ email: s.address })));
    } catch (err) {
        return fail(
            'generic',
            `Unable to check for existing users: ${JSON.stringify(err)}`,
        );
    }
    const byAddress = new Map(
        found.users.map((user) => [(user.email ?? '').toLowerCase(), user]),
    );

    const adopt: { student: RosterStudent; user: UserRecord }[] = [];
    const mint: RosterStudent[] = [];
    const taken: string[] = [];
    for (const student of roster) {
        const user = byAddress.get(student.address.toLowerCase());
        if (user === undefined) mint.push(student);
        else if (signin === 'email') adopt.push({ student, user });
        else taken.push(student.username);
    }
    if (taken.length > 0)
        return fail(
            'account',
            `These usernames are already taken: ${taken.join(', ')}`,
        );

    // Everything that could be refused has been. Take the attempt, so a retry
    // after a dropped response is answered rather than run again.
    const claim = await claimCreation(key, teacher).catch(() => undefined);
    if (claim === undefined)
        return fail('generic', 'Could not record this attempt');
    if (claim.kind === 'done')
        return {
            classid: claim.classid,
            error: undefined,
            students: claim.students,
        };
    if (claim.kind === 'inflight')
        return fail(
            'inflight',
            'This class may already have been created; check your classes',
        );

    const held: string[] = [];
    const made: { uid: string; username: string }[] = [];

    /**
     * Give back everything this attempt took. Deleting the accounts is the half
     * that used to be missing: releasing reservations left the Auth users
     * standing, and with a real address that is an account bound to a
     * stranger's mailbox.
     */
    const rollback = async () => {
        if (made.length > 0)
            await auth
                .deleteUsers(made.map((m) => m.uid))
                .catch((error) =>
                    console.error('Could not undo class accounts', error),
                );
        for (const m of made) await unassignUsername(m.uid, m.username);
        for (const username of held)
            if (!made.some((m) => m.username === username))
                await releaseReservation(username);
        await creationRef(db, key)
            .delete()
            .catch((error) =>
                console.error('Could not undo a class attempt', error),
            );
    };

    // Hold every name before creating anything (#628). Without reservations a
    // class username and a join-page username occupy two disjoint namespaces
    // that both render through Creator.getUsername, so two accounts could end
    // up showing the same name and owning characters called `alice/Cat`.
    for (const student of mint) {
        const result = await reserveUsername(student.username).catch(
            () => 'failed' as const,
        );
        if (result !== 'reserved') {
            await rollback();
            return fail(
                'account',
                `The username ${student.username} is not available`,
            );
        }
        held.push(student.username);
    }

    // Okay, we're ready to create the user accounts!
    const placed = new Map<RosterStudent, Placed>();
    for (const student of mint) {
        try {
            const user = await auth.createUser(
                student.password === undefined
                    ? { email: student.address }
                    : { email: student.address, password: student.password },
            );
            made.push({ uid: user.uid, username: student.username });
            // `emailEligibleOn` only for a student given a real address. It
            // behaves exactly as absent does — both read as eligible — but
            // absent means "we never asked", and this is the per-student half
            // of the teacher's affirmation that they may.
            await assignUsername(
                user.uid,
                student.username,
                signin === 'email' ? { emailEligibleOn: Date.now() } : {},
            );
            placed.set(student, {
                uid: user.uid,
                username: student.username,
                existed: false,
                meta: student.meta,
            });
        } catch (error) {
            // Never include the request in the message: it carries passwords.
            console.error('Could not create a class account', error);
            await rollback();
            return fail('generic', 'Unable to create one of the accounts');
        }
    }

    // An adopted account keeps the name it already has, so the roster and the
    // teacher's download name the account that exists rather than the one the
    // form proposed.
    const adoptedHandles = await getHandles(adopt.map((a) => a.user.uid)).catch(
        () => new Map(),
    );
    for (const { student, user } of adopt)
        placed.set(student, {
            uid: user.uid,
            username:
                adoptedHandles.get(user.uid)?.username ??
                usernameFromEmail(user.email ?? '') ??
                student.username,
            existed: true,
            meta: student.meta,
        });

    const results = roster
        .map((student) => placed.get(student))
        .filter((result) => result !== undefined);

    // Every existing student gets a row too, padded to the same width as the
    // roster's so the table has no ragged rows.
    const existingHandles = await getHandles(existing).catch(() => new Map());
    const width = roster[0]?.meta.length ?? 0;

    const classRef = db.collection('classes').doc();
    try {
        const batch = db.batch();
        batch.set(classRef, {
            id: classRef.id,
            name,
            description,
            teachers: [teacher],
            learners: [...existing, ...results.map((r) => r.uid)],
            info: [
                ...results.map((r) => ({
                    uid: r.uid,
                    username: r.username,
                    meta: r.meta,
                })),
                ...existing.map((uid) => ({
                    uid,
                    // Never the address: this document is read by every member
                    // of the class. `''` is the floor when we know nothing.
                    username:
                        existingHandles.get(uid)?.username ??
                        usernameFromEmail(
                            existingUsers.get(uid)?.email ?? '',
                        ) ??
                        '',
                    meta: new Array(width).fill(''),
                })),
            ],
            galleries: [],
            ...(signin === 'email'
                ? { affirmation: { teacher, on: Date.now() } }
                : {}),
        });
        // One batch, so the class and the record that answers a retry cannot
        // disagree about whether it exists.
        batch.update(creationRef(db, key), {
            classid: classRef.id,
            students: results.map((r) => ({
                username: r.username,
                existed: r.existed,
            })),
        });
        await batch.commit();
    } catch (error) {
        console.error('Could not write a new class', error);
        await rollback();
        return fail('generic', 'Unable to create the class');
    }

    return {
        classid: classRef.id,
        error: undefined,
        students: results.map((r) => ({
            username: r.username,
            existed: r.existed,
        })),
    };
}
