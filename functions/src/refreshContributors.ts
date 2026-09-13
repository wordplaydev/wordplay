import { createContributorsPR, fetchContributorsData } from './contributors.js';
import { isNonProdDeployment } from './prodOnly.js';

export default async function refreshContributors(): Promise<void> {
    // Opens PRs against the public repo, so a second deployment firing the same
    // weekly schedule would open a duplicate.
    if (isNonProdDeployment()) return;

    const token = process.env.GITHUB_TOKEN ?? '';
    const data = await fetchContributorsData(token);
    await createContributorsPR(token, data);
}
