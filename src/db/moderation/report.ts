import { getFunctionsInstance } from '@db/firebase';
import type { ReportInputs, ReportOutput } from 'shared-types';

/**
 * Ask whoever is responsible to review something (#938).
 *
 * A callable rather than a direct write: who may review a report is derived
 * from the subject's visibility, and a reporter naming their own reviewers is
 * the same mistake as a creator clearing their own strikes. It also
 * deduplicates by a deterministic document id, which is what makes reporting
 * twice add a reporter rather than make a second report. See
 * functions/src/report.ts.
 */
export default async function report(
    inputs: ReportInputs,
): Promise<ReportOutput> {
    const functions = await getFunctionsInstance();
    if (functions === undefined)
        throw new Error('Cloud functions are unavailable.');
    const { httpsCallable } = await import('firebase/functions');
    const call = httpsCallable<ReportInputs, ReportOutput>(functions, 'report');
    return (await call(inputs)).data;
}
