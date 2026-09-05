import { getFunctionsInstance } from '@db/firebase';
import type { JoinAccountInputs, JoinAccountOutput } from 'shared-types';

/**
 * Create an account (#628).
 *
 * Goes through a callable rather than `createUserWithEmailAndPassword` for two
 * reasons: it is the only way every account can be guaranteed a username, and
 * it is the only way account creation can be App Check enforced today, since
 * enforcement on Firebase Authentication itself is still Preview (#1299).
 *
 * The region and birthday are used server-side to derive when this creator may
 * hold an email address, and are then discarded. Neither is stored.
 */
export async function joinAccount(
    inputs: JoinAccountInputs,
): Promise<JoinAccountOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return { error: 'failed' };
    const { httpsCallable } = await import('firebase/functions');
    const join = httpsCallable<JoinAccountInputs, JoinAccountOutput>(
        functions,
        'joinAccount',
    );
    try {
        const { data } = await join(inputs);
        return data;
    } catch (error) {
        console.error(error);
        return { error: 'failed' };
    }
}
