import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { CreateClassInputs, CreateClassOutput } from 'shared-types';

export default async function createClass(
    request: CallableRequest<CreateClassInputs>,
): Promise<CreateClassOutput> {
    const auth = admin.auth();
    const db = getFirestore();
    const { teacher, name, description, students, existing } = request.data;

    // Make sure there aren't too many students.
    if (students.length > 50)
        return { classid: undefined, error: { kind: 'limit', info: '' } };

    // Ensure the teacher is a valid user ID.
    try {
        await auth.getUser(teacher);
    } catch (error) {
        console.error(JSON.stringify(error));
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: "The teacher user id provided doesn't exist",
            },
        };
    }

    // Ensure each existing user is a valid user ID and get their usernames.
    const existingEmails: Map<string, string> = new Map();
    for (const uid of existing) {
        try {
            const user = await auth.getUser(uid);
            existingEmails.set(uid, user.email ?? '');
        } catch (error) {
            console.error(JSON.stringify(error));
            return {
                classid: undefined,
                error: {
                    kind: 'generic',
                    info: "One of the existing user ids provided doesn't exist",
                },
            };
        }
    }

    // Ensure the students are the correct type
    if (!Array.isArray(students)) {
        console.error('Received', JSON.stringify(students));
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `expected a list of students but received a ${typeof students}`,
            },
        };
    }

    const malformed = students.some(
        (s) =>
            typeof s.username !== 'string' ||
            typeof s.password !== 'string' ||
            !Array.isArray(s.meta),
    );
    if (malformed)
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `expected students in the list to have a username, password, and list of text, received ${JSON.stringify(malformed)}`,
            },
        };

    // Verify that none of the user accounts exist
    try {
        const result = await auth.getUsers(
            students.map((s) => {
                return { email: s.username };
            }),
        );
        // If any users exist, then we bail.
        if (result.users.length > 0)
            return {
                classid: undefined,
                error: {
                    kind: 'account',
                    info: 'One or more students already have accounts',
                },
            };
    } catch (err) {
        return {
            classid: undefined,
            error: {
                kind: 'generic',
                info: `Unable to check for existing users: ${JSON.stringify(err)}`,
            },
        };
    }

    // Okay, we're ready to create the user accounts!
    const users: { uid: string; username: string; meta: string[] }[] = [];
    for (const student of students) {
        try {
            const user = await auth.createUser({
                email: student.username,
                password: student.password,
            });
            users.push({
                uid: user.uid,
                username: student.username,
                meta: student.meta,
            });
        } catch (error) {
            return {
                classid: undefined,
                error: {
                    kind: 'generic',
                    info: `Unable to create user: ${JSON.stringify(error)}`,
                },
            };
        }
    }

    // Create the class
    const classRef = db.collection('classes').doc();
    await classRef.set({
        id: classRef.id,
        name,
        description,
        teachers: [teacher],
        learners: [...existing, ...users.map((u) => u.uid)],
        // Convert the email address back to a username
        info: [
            ...users.map((u) => {
                return { ...u, username: u.username.split('@')[0] };
            }),
            // Ensure there's a row for each existing student
            ...existing.map((uid) => {
                return {
                    uid,
                    username: existingEmails.get(uid) ?? '',
                    // Ensure the meta array is the same length as the new users
                    meta: users[0]?.meta.map(() => '') ?? [],
                };
            }),
        ],
        galleries: [],
    });

    return { classid: classRef.id, error: undefined };
}
