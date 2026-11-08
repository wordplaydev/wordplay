import { getAuth } from 'firebase-admin/auth';
import {
    assignUsername,
    releaseReservation,
    reserveUsername,
    unassignUsername,
} from './handles.js';

/**
 * Create accounts on a teacher's behalf (#1347), shared by `createClass` and
 * `addClassStudent`. All or nothing: a failure gives back every name and
 * account this call took.
 *
 * NOTHING passed here may be logged: it carries passwords.
 */

export type AccountToMint = {
    username: string;
    address: string;
    password?: string;
};

export type MintedAccount = { uid: string; username: string };

export type MintResult =
    | { made: MintedAccount[] }
    | { failure: 'taken'; username: string }
    | { failure: 'failed' };

/**
 * Delete accounts this module made, and their names. Deleting the accounts is
 * the half that used to be missing: releasing reservations left the Auth users
 * standing, and with a real address that is an account bound to a stranger's
 * mailbox.
 */
export async function undoAccounts(made: MintedAccount[]): Promise<void> {
    if (made.length > 0)
        await getAuth()
            .deleteUsers(made.map((m) => m.uid))
            .catch((error) =>
                console.error('Could not undo class accounts', error),
            );
    for (const m of made) await unassignUsername(m.uid, m.username);
}

/** Make one account per entry, in order, or none at all. */
export async function mintAccounts(
    accounts: AccountToMint[],
    signin: 'password' | 'email',
): Promise<MintResult> {
    const auth = getAuth();
    const held: string[] = [];
    const made: MintedAccount[] = [];

    const rollback = async () => {
        await undoAccounts(made);
        for (const username of held)
            if (!made.some((m) => m.username === username))
                await releaseReservation(username);
    };

    // Hold every name before creating anything (#628). Without reservations a
    // class username and a join-page username occupy two disjoint namespaces
    // that both render through Creator.getUsername, so two accounts could end
    // up showing the same name and owning characters called `alice/Cat`.
    for (const account of accounts) {
        const result = await reserveUsername(account.username).catch(
            () => 'failed' as const,
        );
        if (result !== 'reserved') {
            await rollback();
            return { failure: 'taken', username: account.username };
        }
        held.push(account.username);
    }

    for (const account of accounts) {
        try {
            const user = await auth.createUser(
                account.password === undefined
                    ? { email: account.address }
                    : { email: account.address, password: account.password },
            );
            made.push({ uid: user.uid, username: account.username });
            // `emailEligibleOn` only for a student given a real address. It
            // behaves exactly as absent does — both read as eligible — but
            // absent means "we never asked", and this is the per-student half
            // of the teacher's affirmation that they may.
            await assignUsername(
                user.uid,
                account.username,
                signin === 'email' ? { emailEligibleOn: Date.now() } : {},
            );
        } catch (error) {
            // Never include the accounts in the message: they carry passwords.
            console.error('Could not create a class account', error);
            await rollback();
            return { failure: 'failed' };
        }
    }

    return { made };
}
