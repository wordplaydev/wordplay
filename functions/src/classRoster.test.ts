import { describe, expect, test } from 'vitest';
import { isCreationKey, readRoster } from './classRoster.js';

/**
 * The roster reader is where a class's shape is decided, and everything it
 * refuses is something that would otherwise be refused *after* accounts exist.
 */

const Meta = ['204', 'Chen'];

function password(username: string, extra: object = {}) {
    return { username, password: 'correcthorse', meta: Meta, ...extra };
}
function email(username: string, address: string, extra: object = {}) {
    return { username, email: address, meta: Meta, ...extra };
}

function reading(entries: unknown, method: unknown, affirmed?: unknown) {
    return readRoster(entries, method, affirmed);
}
function students(read: ReturnType<typeof readRoster>) {
    if ('problem' in read) throw new Error(read.problem.info);
    return read.students;
}
function problem(read: ReturnType<typeof readRoster>) {
    if (!('problem' in read)) throw new Error('expected a problem');
    return read.problem;
}

describe('a class is one kind of student throughout', () => {
    test('a password class signs in with synthesized addresses', () => {
        const read = reading([password('alice')], 'password');
        expect('problem' in read ? undefined : read.method).toBe('password');
        const student = students(read)[0]!;
        expect(student.address).toBe('alice@u.wordplay.dev');
        expect(student.password).toBe('correcthorse');
    });

    test('an email class has addresses and no passwords at all', () => {
        const read = reading([email('alice', 'a@school.edu')], 'email', true);
        expect('problem' in read ? undefined : read.method).toBe('email');
        const student = students(read)[0]!;
        expect(student.address).toBe('a@school.edu');
        expect(student.password).toBeUndefined();
    });

    test('a mixed roster cannot be expressed', () => {
        // The method is carried once, on the reading, rather than once per
        // student — so there is no shape a mixed class could take. A student
        // carrying the other kind's field is a client bug, and refused.
        expect(
            problem(
                reading(
                    [password('alice'), email('bobby', 'b@school.edu')],
                    'password',
                ),
            ).kind,
        ).toBe('generic');
        expect(
            problem(
                reading(
                    [email('alice', 'a@school.edu'), password('bobby')],
                    'email',
                    true,
                ),
            ).kind,
        ).toBe('generic');
        const read = reading([password('alice')], 'password');
        expect('problem' in read ? [] : read.students).toHaveLength(1);
        // Nothing on a student says which kind it is; only the reading does.
        expect(Object.keys(students(read)[0]!)).not.toContain('email');
    });

    test('a client from before #1347 sends no method and means passwords', () => {
        // A tab left open across the deploy still works, the same way the
        // synthesized-username unwrap below does.
        const read = reading([password('alice@u.wordplay.dev')], undefined);
        expect('problem' in read ? undefined : read.method).toBe('password');
        expect(students(read)[0]!.username).toBe('alice');
        expect(students(read)[0]!.address).toBe('alice@u.wordplay.dev');
    });

    test('a method we do not understand is refused', () => {
        expect(problem(reading([password('alice')], 'magic')).kind).toBe(
            'generic',
        );
        expect(problem(reading([password('alice')], 3)).kind).toBe('generic');
    });
});

describe('what a roster may not say', () => {
    test('a synthesized address is not a mailbox', () => {
        expect(
            problem(
                reading(
                    [email('alice', 'bobby@u.wordplay.dev')],
                    'email',
                    true,
                ),
            ).kind,
        ).toBe('generic');
    });

    test('an email student with no address is refused', () => {
        expect(
            problem(reading([{ username: 'alice', meta: Meta }], 'email', true))
                .kind,
        ).toBe('generic');
    });

    test('a password shorter than the floor is refused', () => {
        expect(
            problem(
                reading(
                    [{ username: 'alice', password: 'short', meta: Meta }],
                    'password',
                ),
            ).kind,
        ).toBe('generic');
    });

    test('a username that cannot be claimed is refused before anything is reserved', () => {
        expect(problem(reading([password("o'bmar")], 'password')).kind).toBe(
            'account',
        );
    });

    test('two rows naming one person is the roster, not the class', () => {
        // Both used to reach reserveUsername, and the second's 'taken' reported
        // the *class* as unavailable rather than the roster as duplicated.
        expect(
            problem(reading([password('alice'), password('Alice')], 'password'))
                .kind,
        ).toBe('account');
    });

    test('two rows sharing an address is refused too', () => {
        expect(
            problem(
                reading(
                    [
                        email('alice', 'a@school.edu'),
                        email('bobby', 'A@School.edu'),
                    ],
                    'email',
                    true,
                ),
            ).kind,
        ).toBe('account');
    });

    test('a list is required', () => {
        expect(problem(reading('alice', 'password')).kind).toBe('generic');
    });
});

describe('the affirmation', () => {
    test('is demanded in an email class and nowhere else', () => {
        expect('students' in reading([password('alice')], 'password')).toBe(
            true,
        );
        expect(
            problem(reading([email('alice', 'a@school.edu')], 'email')).kind,
        ).toBe('affirmation');
        // Truthy is not the same as affirmed.
        expect(
            problem(reading([email('alice', 'a@school.edu')], 'email', 'yes'))
                .kind,
        ).toBe('affirmation');
    });
});

describe('the attempt key', () => {
    test('only a UUID may name a document', () => {
        // A document id taken from client input has to be constrained, or a `/`
        // in it walks out of the collection.
        expect(isCreationKey('7f1c0f3e-9f1a-4c53-8a2b-2f6c1d5e4a90')).toBe(
            true,
        );
        expect(isCreationKey('../creators/someone')).toBe(false);
        expect(isCreationKey('a/b')).toBe(false);
        expect(isCreationKey('')).toBe(false);
        expect(isCreationKey(undefined)).toBe(false);
        expect(isCreationKey('not-a-uuid')).toBe(false);
    });
});
