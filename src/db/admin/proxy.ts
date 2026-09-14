import { getFunctionsInstance } from '@db/firebase';
import type { StartProxyInputs, StartProxyOutput } from 'shared-types';

/**
 * Mint a read-only session as another creator (#1313).
 *
 * Returns a custom token the proxy tab exchanges for a session. Nothing here
 * signs anybody in: the token travels to a *new tab*, which is what keeps the
 * administrator's own session, settings and local projects untouched.
 */
export async function startProxy(
    inputs: StartProxyInputs,
): Promise<StartProxyOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<StartProxyInputs, StartProxyOutput>(
        functions,
        'startProxy',
    );
    return (await call(inputs)).data;
}
