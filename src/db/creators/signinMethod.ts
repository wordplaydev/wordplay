import { getFunctionsInstance } from '@db/firebase';
import type {
    ClaimUsernameInputs,
    ClaimUsernameOutput,
    SwitchToPasswordInputs,
    SwitchToPasswordOutput,
} from 'shared-types';

/**
 * Changing how you sign in (#628), in both directions.
 *
 * The two halves are asymmetric on purpose. Moving *to* an email address has to
 * prove the address is yours, so it stays on the client with
 * `verifyBeforeUpdateEmail`. Moving *away* from one lands on the synthesized
 * `@u.wordplay.dev` address, which no verification mail could reach and which
 * needs none, so it happens server-side.
 */

/**
 * Record the signed-in creator's username.
 *
 * **This has to succeed before an account's address stops being the synthesized
 * one.** A username account's name lives only in that address; the moment it is
 * replaced by a real one, the name is gone — and with it every
 * `@username/Character` reference to that creator's work, in anyone's project.
 * The switch below refuses to proceed if this didn't land.
 */
export async function claimUsername(
    username: string,
): Promise<'claimed' | 'taken' | 'invalid' | 'held' | 'failed'> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const claim = httpsCallable<ClaimUsernameInputs, ClaimUsernameOutput>(
        functions,
        'claimUsername',
    );
    try {
        const { data } = await claim({ username });
        if (data.claimed === true) return 'claimed';
        return data.error === 'unauthenticated'
            ? 'failed'
            : (data.error ?? 'failed');
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}

/** Move to signing in with a username and password. */
export async function switchToPassword(
    password: string,
): Promise<'switched' | 'no-username' | 'failed'> {
    const functions = await getFunctionsInstance();
    if (functions === undefined) return 'failed';
    const { httpsCallable } = await import('firebase/functions');
    const switchIt = httpsCallable<
        SwitchToPasswordInputs,
        SwitchToPasswordOutput
    >(functions, 'switchToPassword');
    try {
        const { data } = await switchIt({ password });
        if (data.switched === true) return 'switched';
        return data.error === 'no-username' ? 'no-username' : 'failed';
    } catch (error) {
        console.error(error);
        return 'failed';
    }
}
