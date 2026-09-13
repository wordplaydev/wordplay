import type { Request } from 'firebase-functions/v2/https';
import type express from 'express';

import { tidyStaleAssignments } from './staleAssignments.js';
import { isNonProdDeployment } from './prodOnly.js';

/** True when DRY_RUN is set in the environment, so writes are suppressed. */
function envDryRun(): boolean {
    return process.env.DRY_RUN === 'true';
}

/** Scheduled entry point: runs the tidy pass, honoring DRY_RUN from the env. */
export default async function tidyStaleAssignmentsScheduled(): Promise<void> {
    // Comments on and unassigns real issues, so a second deployment firing the
    // same daily schedule would nudge everyone twice.
    if (isNonProdDeployment()) return;

    const token = process.env.GITHUB_TOKEN ?? '';
    const report = await tidyStaleAssignments(
        token,
        { dryRun: envDryRun() },
        (msg) => console.log(msg),
    );
    console.log('Stale-assignment tidy report:', JSON.stringify(report));
}

/** Manual HTTP entry point for testing. Pass `?dry=1` to force a dry run
 * (logs and returns intended actions without writing). Deliberately not
 * project-guarded: exercising this by hand is what a test deployment is for. */
export async function tidyStaleAssignmentsRequest(
    request: Request,
    response: express.Response,
): Promise<void> {
    const token = process.env.GITHUB_TOKEN ?? '';
    const dryRun = envDryRun() || request.query['dry'] === '1';
    const report = await tidyStaleAssignments(token, { dryRun }, (msg) =>
        console.log(msg),
    );
    response.json(report);
}
