import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Security-rules tests for classes, and the only place `teacher` is enforced.
 *
 * These did not exist before the superuser claim. They matter now for a reason
 * beyond coverage: `isTeacher` used to be declared *inside* this match block,
 * and making `admin` imply it meant deleting that nested copy so the top-level
 * one is what these rules resolve to. If a nested function had shadowed the
 * outer one silently rather than failing to compile, `admin ⇒ teacher` would be
 * dead for exactly the one collection `teacher` governs, with no symptom
 * anywhere. The administrator cases below are what prove the deletion landed.
 */

const Users = {
    Teacher: 'rulestest-class-teacher',
    Other: 'rulestest-class-other-teacher',
    Learner: 'rulestest-class-learner',
    Stranger: 'rulestest-class-stranger',
    Admin: 'rulestest-class-admin',
};

const Classes = { Existing: 'rulestest-class-1' };

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

function newClass(over: Record<string, unknown> = {}) {
    return {
        id: 'rulestest-class-new',
        name: 'A class',
        description: 'For testing',
        teachers: [Users.Teacher],
        learners: [Users.Learner],
        ...over,
    };
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

// Re-seeded rather than cleared: every rules suite shares one emulator, so a
// `clearFirestore()` here wipes the other suites' fixtures out from under them.
// Ids are prefixed `rulestest-class-` so nothing collides.
beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
        await context
            .firestore()
            .doc(`classes/${Classes.Existing}`)
            .set(newClass({ id: Classes.Existing }));
    });
});

afterAll(async () => {
    await env.cleanup();
});

describe('creating a class', () => {
    it('is refused to a creator with no privileges', async () => {
        await assertFails(
            as(Users.Teacher).collection('classes').add(newClass()),
        );
    });

    it('is allowed to a teacher', async () => {
        await assertSucceeds(
            as(Users.Teacher, { teacher: true })
                .collection('classes')
                .add(newClass()),
        );
    });

    // The superuser case. Holding `admin` alone is enough.
    it('is allowed to an administrator holding no teacher claim', async () => {
        await assertSucceeds(
            as(Users.Admin, { admin: true })
                .collection('classes')
                .add(newClass({ teachers: [Users.Admin] })),
        );
    });

    it('is refused to a signed-out visitor', async () => {
        await assertFails(
            env
                .unauthenticatedContext()
                .firestore()
                .collection('classes')
                .add(newClass()),
        );
    });
});

describe('changing a class', () => {
    it('is allowed to a teacher of that class', async () => {
        await assertSucceeds(
            as(Users.Teacher, { teacher: true })
                .doc(`classes/${Classes.Existing}`)
                .update({ name: 'Renamed' }),
        );
    });

    // Being a superuser is not membership: the privilege half of the rule is
    // satisfied, the "and only their own" half is not. Same shape as
    // createClass.ts, which keeps its `uid !== teacher` guard for an admin.
    it('is refused to an administrator who is not one of its teachers', async () => {
        await assertFails(
            as(Users.Admin, { admin: true })
                .doc(`classes/${Classes.Existing}`)
                .update({ name: 'Renamed' }),
        );
    });

    it('is refused to another teacher who is not one of its teachers', async () => {
        await assertFails(
            as(Users.Other, { teacher: true })
                .doc(`classes/${Classes.Existing}`)
                .update({ name: 'Renamed' }),
        );
    });

    it('is refused to a learner in it', async () => {
        await assertFails(
            as(Users.Learner)
                .doc(`classes/${Classes.Existing}`)
                .update({ name: 'Renamed' }),
        );
    });
});

describe('reading a class', () => {
    it('is allowed to a learner in it', async () => {
        await assertSucceeds(
            as(Users.Learner).doc(`classes/${Classes.Existing}`).get(),
        );
    });

    it('is allowed to a teacher of it', async () => {
        await assertSucceeds(
            as(Users.Teacher).doc(`classes/${Classes.Existing}`).get(),
        );
    });

    // `admin` implies `teacher`, and `teacher` alone never granted a read of
    // someone else's class — membership does. So this stays refused, and the
    // superuser claim must not have widened it.
    it('is refused to an administrator who is neither', async () => {
        await assertFails(
            as(Users.Admin, { admin: true })
                .doc(`classes/${Classes.Existing}`)
                .get(),
        );
    });

    it('is refused to a stranger', async () => {
        await assertFails(
            as(Users.Stranger).doc(`classes/${Classes.Existing}`).get(),
        );
    });
});
