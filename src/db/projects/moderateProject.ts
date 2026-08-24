import { getFunctionsInstance } from '@db/firebase';
import type {
    ModerateProjectInputs,
    ModerateProjectOutput,
} from 'shared-types';

/**
 * Record a moderator's decision about a project (#193).
 *
 * A callable rather than a direct write, because everything a decision does has
 * to be trustworthy and most of it isn't the client's to do: the count that
 * leads to losing public sharing, the custom claim that enforces it, and taking
 * down what the creator has already published. See
 * functions/src/moderateProject.ts.
 */
export default async function moderateProject(
    inputs: ModerateProjectInputs,
): Promise<ModerateProjectOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<ModerateProjectInputs, ModerateProjectOutput>(
        functions,
        'moderateProject',
    );
    return (await call(inputs)).data;
}
