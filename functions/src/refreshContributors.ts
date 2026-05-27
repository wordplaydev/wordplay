import { createContributorsPR, fetchContributorsData } from './contributors.js';

export default async function refreshContributors(): Promise<void> {
    const token = process.env.GITHUB_TOKEN ?? '';
    const data = await fetchContributorsData(token);
    await createContributorsPR(token, data);
}
