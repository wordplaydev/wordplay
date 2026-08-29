import { getFunctionsInstance } from '@db/firebase';
import type { ModerateInputs, ModerateOutput } from 'shared-types';

/**
 * Record a decision about something someone asked to have reviewed (#938).
 *
 * A callable rather than a direct write because almost nothing a decision does
 * is the client's to do: who may decide is derived from the subject's current
 * visibility, the warning count that leads to losing public sharing, the custom
 * claim that enforces it, and delivering the outcome to people who cannot read
 * the report for themselves. See functions/src/moderate.ts.
 */
export default async function moderate(
    inputs: ModerateInputs,
): Promise<ModerateOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<ModerateInputs, ModerateOutput>(
        functions,
        'moderate',
    );
    return (await call(inputs)).data;
}
