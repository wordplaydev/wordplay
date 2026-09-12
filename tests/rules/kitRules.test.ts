import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { afterAll, beforeAll, describe, it } from 'vitest';

/**
 * Security-rules tests for kits (#8). Three claims carry the design: a published version
 * is **immutable** and deletable only while its kit has never been listed, a kit is
 * **never deletable** and unlisting it must not take its versions down, and both reads
 * are **field tests with no `get()`**, which is what keeps resolving a project's borrows
 * off the rules' document-access budget.
 */

const Users = {
    Owner: 'rulestest-kit-owner',
    Stranger: 'rulestest-kit-stranger',
    Banned: 'rulestest-kit-banned',
    Mod: 'rulestest-kit-mod',
};

const Kits = {
    Listed: 'rulestest-kit-listed',
    Private: 'rulestest-kit-private',
    /** Unlisted, but with a version still published. Its own document because the test
     *  below changes it, and the seed is shared by every test in this file. */
    Withdrawn: 'rulestest-kit-withdrawn',
    /** Never listed, with a newest version that may still be withdrawn. */
    Fresh: 'rulestest-kit-fresh',
    /** Listed once, so its versions are permanent however it is set now. */
    WasListed: 'rulestest-kit-waslisted',
    /** Approved, listed, and carrying the `words` the `kitEdited` trigger wrote — the
     *  state a kit is actually in when its owner publishes a second version. */
    Approved: 'rulestest-kit-approved',
};

let env: RulesTestEnvironment;

function as(uid: string, claims?: Record<string, unknown>) {
    return env.authenticatedContext(uid, claims).firestore();
}

function anon() {
    return env.unauthenticatedContext().firestore();
}

/** A kit at the values `kitServerFieldsInitial()` requires of a create. */
function freshKit(owner: string, name: string, isPublic = false) {
    return {
        v: 1,
        id: 'ignored',
        owner,
        name,
        aliases: [],
        collaborators: [],
        description: '',
        latest: 0,
        versionCount: 0,
        public: isPublic,
        moderation: 'unrequested',
        moderatedAt: null,
        listed: false,
        listedVersion: null,
        flags: {
            dehumanization: null,
            violence: null,
            disclosure: null,
            misinformation: null,
        },
        words: [],
        exports: [],
        kinds: [],
        updated: 1,
        originProject: null,
    };
}

function freshVersion(owner: string, kit: string, isPublic = true) {
    return {
        v: 1,
        id: `${kit}_1`,
        kit,
        version: 1,
        owner,
        name: 'owner/colors',
        public: isPublic,
        sourceName: 'colors/en',
        code: '↑ sunset/en: 1',
        locales: ['en-US'],
        exports: ['sunset'],
        created: 1,
    };
}

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'demo-wordplay',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

afterAll(async () => {
    await env.cleanup();
});

// Seeded once, never cleared: every rules suite shares one emulator, so a
// `clearFirestore()` here wipes the other suites' fixtures out from under them. Ids are
// prefixed `rulestest-kit-` so nothing collides.
beforeAll(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db
            .doc(`kits/${Kits.Listed}`)
            .set({ ...freshKit(Users.Owner, 'owner/colors', true) });
        await db
            .doc(`kits/${Kits.Private}`)
            .set({ ...freshKit(Users.Owner, 'owner/secret', false) });
        await db
            .doc(`kitversions/${Kits.Listed}_1`)
            .set(freshVersion(Users.Owner, Kits.Listed));
        await db
            .doc(`kitversions/${Kits.Private}_1`)
            .set(freshVersion(Users.Owner, Kits.Private, false));
        await db
            .doc(`kits/${Kits.Withdrawn}`)
            .set({ ...freshKit(Users.Owner, 'owner/withdrawn', false) });
        await db
            .doc(`kitversions/${Kits.Withdrawn}_1`)
            .set(freshVersion(Users.Owner, Kits.Withdrawn, true));
        // `latest: 1` so the version below is the newest — the only one withdrawable.
        await db.doc(`kits/${Kits.Fresh}`).set({
            ...freshKit(Users.Owner, 'owner/fresh', false),
            latest: 1,
            versionCount: 1,
        });
        await db
            .doc(`kitversions/${Kits.Fresh}_1`)
            .set(freshVersion(Users.Owner, Kits.Fresh));
        await db.doc(`kits/${Kits.WasListed}`).set({
            ...freshKit(Users.Owner, 'owner/waslisted', false),
            latest: 1,
            versionCount: 1,
            // Unlisted *now*, but a moderator has seen it, so someone may hold a
            // borrow of it.
            moderation: 'approved',
        });
        await db
            .doc(`kitversions/${Kits.WasListed}_1`)
            .set(freshVersion(Users.Owner, Kits.WasListed));
        // A kit as it stands after a moderator approves its first version: the callable
        // has written `moderation`/`moderatedAt`/`listed`/`listedVersion` and the
        // `kitEdited` trigger has rebuilt `words`. This is the only fixture that
        // reproduces what the publish path actually writes against.
        await db.doc(`kits/${Kits.Approved}`).set({
            ...freshKit(Users.Owner, 'owner/approved', true),
            latest: 1,
            versionCount: 1,
            moderation: 'approved',
            moderatedAt: 2,
            listed: true,
            listedVersion: 1,
            words: ['approved', 'owner'],
            exports: ['sunset'],
        });
        await db
            .doc(`kitversions/${Kits.Approved}_1`)
            .set(freshVersion(Users.Owner, Kits.Approved));
    });
});

describe('reading a kit', () => {
    it('lets anyone, even signed out, read a listed kit', async () => {
        await assertSucceeds(anon().doc(`kits/${Kits.Listed}`).get());
    });

    it('hides an unlisted kit from a stranger', async () => {
        await assertFails(as(Users.Stranger).doc(`kits/${Kits.Private}`).get());
    });

    it('lets the owner read their own unlisted kit', async () => {
        await assertSucceeds(as(Users.Owner).doc(`kits/${Kits.Private}`).get());
    });

    it('lets a moderator read an unlisted kit', async () => {
        // A reported kit has usually been unlisted by the time anyone reviews it.
        await assertSucceeds(
            as(Users.Mod, { mod: true }).doc(`kits/${Kits.Private}`).get(),
        );
    });
});

describe('creating a kit', () => {
    it('requires an account', async () => {
        await assertFails(
            anon()
                .doc('kits/rulestest-kit-new0')
                .set(freshKit(Users.Owner, 'owner/new')),
        );
    });

    it('refuses one claiming someone else as owner', async () => {
        await assertFails(
            as(Users.Stranger)
                .doc('kits/rulestest-kit-new1')
                .set(freshKit(Users.Owner, 'owner/new')),
        );
    });

    it('refuses one that arrives already approved', async () => {
        // The registry listing is `public && moderation == 'approved'`, and the
        // unchanged-guard has nothing to compare against on a create — the hole
        // galleries had (#1352).
        await assertFails(
            as(Users.Owner)
                .doc('kits/rulestest-kit-new2')
                .set({
                    ...freshKit(Users.Owner, 'owner/new', true),
                    moderation: 'approved',
                }),
        );
    });

    it('refuses one that arrives already listed', async () => {
        // `listed` is what the registry actually queries, so a kit that could arrive with
        // it set would walk straight into the guide with no moderator seeing it — the
        // same hole `moderation: 'approved'` is guarded against just above.
        await assertFails(
            as(Users.Owner)
                .doc('kits/rulestest-kit-new6')
                .set({
                    ...freshKit(Users.Owner, 'owner/new', true),
                    listed: true,
                    listedVersion: 1,
                }),
        );
    });

    it('refuses one that arrives with words already filled in', async () => {
        await assertFails(
            as(Users.Owner)
                .doc('kits/rulestest-kit-new3')
                .set({ ...freshKit(Users.Owner, 'owner/new'), words: ['x'] }),
        );
    });

    it('accepts a properly initialized kit', async () => {
        await assertSucceeds(
            as(Users.Owner)
                .doc('kits/rulestest-kit-new4')
                .set(freshKit(Users.Owner, 'owner/new')),
        );
    });

    it('refuses a banned creator publishing a listed kit', async () => {
        await assertFails(
            as(Users.Banned, { banned: true })
                .doc('kits/rulestest-kit-new5')
                .set(freshKit(Users.Banned, 'banned/new', true)),
        );
    });

    it('still lets a banned creator keep an unlisted kit', async () => {
        // A ban removes public sharing, not the ability to work.
        await assertSucceeds(
            as(Users.Banned, { banned: true })
                .doc('kits/rulestest-kit-new6')
                .set(freshKit(Users.Banned, 'banned/new', false)),
        );
    });
});

describe('changing a kit', () => {
    it('lets the owner edit the description', async () => {
        await assertSucceeds(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ description: 'Colours I like.' }),
        );
    });

    it('refuses a stranger', async () => {
        await assertFails(
            as(Users.Stranger)
                .doc(`kits/${Kits.Listed}`)
                .update({ description: 'mine now' }),
        );
    });

    it('refuses the owner approving their own kit', async () => {
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ moderation: 'approved' }),
        );
    });

    it('refuses the owner writing their own search words', async () => {
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ words: ['free', 'real', 'estate'] }),
        );
    });

    it('refuses the owner listing their own kit', async () => {
        // Approval is of a version, so this is the field that puts a kit in front of
        // people — and the one a creator must not be able to write for themselves.
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ listed: true, listedVersion: 1 }),
        );
    });

    it('refuses the owner choosing which version is listed', async () => {
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ listedVersion: 99 }),
        );
    });

    it("refuses the owner giving their kit someone else's name", async () => {
        // A borrow resolves `@name/kit` through aliases as well as through `name`, so a
        // client that could write its own would make its kit answer to someone else's
        // name — silently, and to everyone. Only `changeUsername` writes them, through
        // the Admin SDK, which these rules don't apply to.
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ aliases: ['someoneelse/colors'] }),
        );
    });

    it('refuses handing a kit to someone else', async () => {
        // A version is immutable and already names its owner, so a transfer would
        // leave the two disagreeing about who is answerable for the code.
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Listed}`)
                .update({ owner: Users.Stranger }),
        );
    });

    it('lets the owner publish a second version of an approved kit', async () => {
        // The production path is `batch.set` of the WHOLE document, not the partial
        // `update` every other test here uses — so every server-owned field is present in
        // `request.resource.data` and each one has to match what is stored. A refused
        // write is silent, and what it looks like is a creator told their new version is
        // being moderated while nothing ever reached the server.
        await assertSucceeds(
            as(Users.Owner)
                .doc(`kits/${Kits.Approved}`)
                .set({
                    ...freshKit(Users.Owner, 'owner/approved', true),
                    latest: 2,
                    versionCount: 2,
                    moderation: 'approved',
                    moderatedAt: 2,
                    listed: true,
                    listedVersion: 1,
                    words: ['approved', 'owner'],
                    exports: ['sunset', 'dusk'],
                    updated: 3,
                }),
        );
    });

    it('refuses deleting a kit at all', async () => {
        // Other people's programs borrow this.
        await assertFails(as(Users.Owner).doc(`kits/${Kits.Listed}`).delete());
    });
});

describe('a published version', () => {
    it('is readable by anyone, even signed out', async () => {
        await assertSucceeds(anon().doc(`kitversions/${Kits.Listed}_1`).get());
    });

    it('is unreadable by a stranger once taken down', async () => {
        await assertFails(
            as(Users.Stranger).doc(`kitversions/${Kits.Private}_1`).get(),
        );
    });

    it('cannot be rewritten, even by its owner', async () => {
        // This is what "a version is immutable" means in practice: a program that
        // names version 3 keeps meaning what it meant.
        await assertFails(
            as(Users.Owner)
                .doc(`kitversions/${Kits.Listed}_1`)
                .update({ code: '↑ sunset/en: 999' }),
        );
    });

    it('accepts a bounded list of kinds from its owner', async () => {
        // The one index a client writes, because no server can derive it — see `kinds`
        // in Kit.ts. The trigger, not the rules, is what re-queues a kit that changes it.
        await assertSucceeds(
            as(Users.Owner)
                .doc(`kits/${Kits.Fresh}`)
                .update({ kinds: ['Color', 'Number'] }),
        );
    });

    it('refuses more kinds than the index is bounded to', async () => {
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Fresh}`)
                .update({
                    kinds: Array.from({ length: 21 }, (_, i) => `Kind${i}`),
                }),
        );
    });

    it('still refuses a client-written search index', async () => {
        // `words` stays the server's: it is unbounded, nobody reviews it, and a kit
        // claiming every word would be found by everyone searching for anything.
        await assertFails(
            as(Users.Owner)
                .doc(`kits/${Kits.Fresh}`)
                .update({ words: ['free'] }),
        );
    });

    it('cannot be deleted while it is not the newest', async () => {
        // `Kits.Listed` records `latest: 0`, so version 1 is not what a borrow with no
        // number resolves to and withdrawing it would leave a hole.
        await assertFails(
            as(Users.Owner).doc(`kitversions/${Kits.Listed}_1`).delete(),
        );
    });

    it('cannot be deleted once the kit has been listed', async () => {
        // The whole rule in one case: a moderator has seen this kit, so someone may be
        // borrowing it, and unlisting it again does not make that untrue.
        await assertFails(
            as(Users.Owner).doc(`kitversions/${Kits.WasListed}_1`).delete(),
        );
    });

    it('cannot be deleted by someone else', async () => {
        await assertFails(
            as(Users.Stranger).doc(`kitversions/${Kits.Fresh}_1`).delete(),
        );
    });

    it('can be withdrawn by its owner while the kit has never been listed', async () => {
        // Safe by construction: an unlisted kit has never appeared in the guide, so
        // nobody could have found it to borrow. Last, because it consumes the fixture.
        await assertSucceeds(
            as(Users.Owner).doc(`kitversions/${Kits.Fresh}_1`).delete(),
        );
    });

    it('cannot be created claiming someone else as owner', async () => {
        await assertFails(
            as(Users.Stranger)
                .doc(`kitversions/${Kits.Listed}_2`)
                .set({
                    ...freshVersion(Users.Owner, Kits.Listed),
                    id: `${Kits.Listed}_2`,
                    version: 2,
                }),
        );
    });

    it('stays readable when only the kit is unlisted', async () => {
        // The two `public` flags do different jobs, and this is the whole point of
        // having two: unlisting a kit stops new people finding it, while every program
        // that already borrows it keeps working. Only a moderation decision clears a
        // version, and it does that through the Admin SDK.
        await assertFails(anon().doc(`kits/${Kits.Withdrawn}`).get());
        await assertSucceeds(
            anon().doc(`kitversions/${Kits.Withdrawn}_1`).get(),
        );
    });

    it('can be created by its owner', async () => {
        await assertSucceeds(
            as(Users.Owner)
                .doc(`kitversions/${Kits.Listed}_2`)
                .set({
                    ...freshVersion(Users.Owner, Kits.Listed),
                    id: `${Kits.Listed}_2`,
                    version: 2,
                }),
        );
    });
});
