import { firebaseReachable } from '@db/Database';
import { getFunctionsInstance } from '@db/firebase';
import type {
    UsernameAvailableInputs,
    UsernameAvailableOutput,
} from 'shared-types';

/**
 * Whether usernames could be claimed (#628).
 *
 * Replaces the `emailExists` callable this used to go through, which answered
 * questions about *addresses* in bulk and was unauthenticated — a creator's
 * email address was one call away for anyone who could guess it. This answers
 * only about usernames, which are public by design.
 *
 * Advisory: the transaction inside `joinAccount` is what actually decides, so
 * two people can still submit the same name in the same second and one will be
 * told it's taken after the fact.
 */
export async function usernamesAvailable(
    usernames: string[],
): Promise<Record<string, boolean> | undefined> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return undefined;
    const { httpsCallable } = await import('firebase/functions');
    const available = httpsCallable<
        UsernameAvailableInputs,
        UsernameAvailableOutput
    >(functions, 'usernameAvailable');
    try {
        const { data } = await available({ usernames });
        firebaseReachable.set(true);
        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

/** Whether one name could be claimed. Undefined when we couldn't ask, which the
 *  form treats as "don't say anything yet" rather than as unavailable. */
export async function usernameAvailable(
    username: string,
): Promise<boolean | undefined> {
    return (await usernamesAvailable([username]))?.[username];
}
