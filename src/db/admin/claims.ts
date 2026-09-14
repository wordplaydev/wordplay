import { getFunctionsInstance } from '@db/firebase';
import type {
    GetClaimHoldersOutput,
    SetClaimsInputs,
    SetClaimsOutput,
} from 'shared-types';

/**
 * Everyone who holds a privilege.
 *
 * A callable rather than a query because a custom claim is not a field any
 * query reaches — see functions/src/getClaimHolders.ts, which pages all of
 * Auth to answer this.
 */
export async function getClaimHolders(): Promise<GetClaimHoldersOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<void, GetClaimHoldersOutput>(
        functions,
        'getClaimHolders',
    );
    return (await call()).data;
}

/** Give someone a privilege, or take one away. */
export async function setClaims(
    inputs: SetClaimsInputs,
): Promise<SetClaimsOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<SetClaimsInputs, SetClaimsOutput>(
        functions,
        'setClaims',
    );
    return (await call(inputs)).data;
}
