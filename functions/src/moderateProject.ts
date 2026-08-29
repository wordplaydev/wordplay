import type { CallableRequest } from 'firebase-functions/v2/https';
import type {
    ModerateProjectInputs,
    ModerateProjectOutput,
} from 'shared-types';
import moderate from './moderate.js';

/**
 * Superseded by the `moderate` callable (#938), and kept for exactly one
 * release.
 *
 * A callable is versioned by deploy, but a long-open tab holds a stale client
 * bundle: a moderator part-way through a queue would call this name and get
 * nothing. Delete it in the release after the one that ships `moderate` — and
 * delete it, rather than letting a third permanent entry point accumulate.
 */
export default async function moderateProject(
    request: CallableRequest<ModerateProjectInputs>,
): Promise<ModerateProjectOutput> {
    const { project, flags, strike, decision } = request.data;
    const { count, banned } = await moderate({
        ...request,
        data: {
            kind: 'project',
            subject: project,
            flags,
            strike,
            decision,
        },
    });
    return { count, banned };
}
