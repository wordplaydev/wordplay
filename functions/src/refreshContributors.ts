import { createContributorsPR, fetchContributorsData } from './contributors.js';

/** The contributor refresh opens PRs against the public repo, so it must run
 * from exactly one place. Guard against a non-prod deployment (e.g.
 * wordplay-dev) that fires the same weekly schedule and opens a duplicate PR.
 * Only bail when we positively identify a non-prod project, so a missing
 * project env var can never silently disable the prod job. */
const PROD_PROJECT = 'wordplay-prod';

export default async function refreshContributors(): Promise<void> {
    const project =
        process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
    if (project !== undefined && project !== PROD_PROJECT) return;

    const token = process.env.GITHUB_TOKEN ?? '';
    const data = await fetchContributorsData(token);
    await createContributorsPR(token, data);
}
