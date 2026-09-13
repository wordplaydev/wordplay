/**
 * Scheduled work whose effects land outside its own project — GitHub writes,
 * outbound mail — must run from exactly one place, or a second deployment firing
 * the same schedule doubles it.
 *
 * Only bail on a positively identified non-prod project, so a missing project
 * env var can never silently disable the prod job.
 *
 * Deliberately a module with no imports at all, for the reason `origin.ts`
 * gives: the root vitest project runs `functions/src` tests, where a static
 * import cone reaching `firebase-functions` isn't installed.
 */
const PROD_PROJECT = 'wordplay-prod';

/** True when this deployment is positively identified as something other than
 * production, so outward-facing scheduled work should not run. */
export function isNonProdDeployment(): boolean {
    const project =
        process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
    return project !== undefined && project !== PROD_PROJECT;
}
