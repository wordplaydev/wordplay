import { isRecord } from './shared/guards.js';

import {
    githubFetch,
    isBot,
    paginate,
    REPO_BASE,
    type GitHubUser,
    isGitHubUserOrNull,
    isGitRef,
} from './github.js';

type GitHubCommit = {
    html_url: string;
    author: GitHubUser | null;
    commit: { author: { name: string; date: string }; message: string };
};

function isGitHubCommit(value: unknown): value is GitHubCommit {
    return (
        isRecord(value) &&
        typeof value.html_url === 'string' &&
        isGitHubUserOrNull(value.author) &&
        isRecord(value.commit) &&
        isRecord(value.commit.author) &&
        typeof value.commit.author.name === 'string' &&
        typeof value.commit.author.date === 'string' &&
        typeof value.commit.message === 'string'
    );
}

type GitHubIssue = {
    number: number;
    html_url: string;
    title: string;
    created_at: string;
    user: GitHubUser | null;
    pull_request?: unknown;
};

function isGitHubIssue(value: unknown): value is GitHubIssue {
    return (
        isRecord(value) &&
        typeof value.number === 'number' &&
        typeof value.html_url === 'string' &&
        typeof value.title === 'string' &&
        typeof value.created_at === 'string' &&
        isGitHubUserOrNull(value.user)
    );
}

type GitHubComment = {
    html_url: string;
    body: string;
    created_at: string;
    user: GitHubUser | null;
};

function isGitHubComment(value: unknown): value is GitHubComment {
    return (
        isRecord(value) &&
        typeof value.html_url === 'string' &&
        typeof value.body === 'string' &&
        typeof value.created_at === 'string' &&
        isGitHubUserOrNull(value.user)
    );
}

const ReviewStates = [
    'APPROVED',
    'CHANGES_REQUESTED',
    'COMMENTED',
    'DISMISSED',
    'PENDING',
] as const;

type GitHubReview = {
    html_url: string;
    body: string;
    state: (typeof ReviewStates)[number];
    submitted_at: string | null;
    user: GitHubUser | null;
};

function isGitHubReview(value: unknown): value is GitHubReview {
    return (
        isRecord(value) &&
        typeof value.html_url === 'string' &&
        typeof value.body === 'string' &&
        ReviewStates.some((state) => state === value.state) &&
        (value.submitted_at === null ||
            typeof value.submitted_at === 'string') &&
        isGitHubUserOrNull(value.user)
    );
}

export type ContributionType =
    | 'commit'
    | 'issue'
    | 'pull_request'
    | 'issue_comment'
    | 'pr_review'
    | 'pr_review_comment';

export type Contributor = {
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
    counts: Record<ContributionType, number>;
    latest: string;
};

export type ContributorsData = {
    created: string;
    contributors: Contributor[];
};

function getOrAdd(
    map: Map<string, Contributor>,
    user: GitHubUser,
    fallbackName: string | null,
): Contributor {
    const existing = map.get(user.login);
    if (existing !== undefined) return existing;
    const added: Contributor = {
        login: user.login,
        name: fallbackName,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        counts: {
            commit: 0,
            issue: 0,
            pull_request: 0,
            issue_comment: 0,
            pr_review: 0,
            pr_review_comment: 0,
        },
        latest: '',
    };
    map.set(user.login, added);
    return added;
}

function record(
    contributor: Contributor,
    type: ContributionType,
    date: string,
): void {
    contributor.counts[type]++;
    if (date > contributor.latest) contributor.latest = date;
}

export async function fetchContributorsData(
    token: string,
    onProgress?: (msg: string) => void,
): Promise<ContributorsData> {
    const log = onProgress ?? (() => undefined);
    const base = REPO_BASE;
    const byLogin = new Map<string, Contributor>();

    log('Fetching commits...');
    const commits = await paginate(token, `${base}/commits`, isGitHubCommit);
    log(`  ${commits.length} commits fetched.`);
    for (const c of commits) {
        if (!c.author || isBot(c.author)) continue;
        record(
            getOrAdd(byLogin, c.author, c.commit.author.name),
            'commit',
            c.commit.author.date,
        );
    }

    log('Fetching issues...');
    const issues = await paginate(
        token,
        `${base}/issues?state=all`,
        isGitHubIssue,
    );
    log(`  ${issues.length} issues fetched.`);
    for (const issue of issues) {
        if (!issue.user || issue.pull_request || isBot(issue.user)) continue;
        record(getOrAdd(byLogin, issue.user, null), 'issue', issue.created_at);
    }

    log('Fetching pull requests...');
    const prs = await paginate(token, `${base}/pulls?state=all`, isGitHubIssue);
    log(`  ${prs.length} pull requests fetched.`);
    for (const pr of prs) {
        if (!pr.user || isBot(pr.user)) continue;
        record(getOrAdd(byLogin, pr.user, null), 'pull_request', pr.created_at);
    }

    log('Fetching issue comments...');
    const comments = await paginate(
        token,
        `${base}/issues/comments`,
        isGitHubComment,
    );
    log(`  ${comments.length} comments fetched.`);
    for (const comment of comments) {
        if (!comment.user || isBot(comment.user)) continue;
        record(
            getOrAdd(byLogin, comment.user, null),
            'issue_comment',
            comment.created_at,
        );
    }

    log('Fetching PR review comments...');
    const reviewComments = await paginate(
        token,
        `${base}/pulls/comments`,
        isGitHubComment,
    );
    log(`  ${reviewComments.length} PR review comments fetched.`);
    for (const comment of reviewComments) {
        if (!comment.user || isBot(comment.user)) continue;
        record(
            getOrAdd(byLogin, comment.user, null),
            'pr_review_comment',
            comment.created_at,
        );
    }

    log(`Fetching PR reviews for ${prs.length} PRs...`);
    let reviewCount = 0;
    for (const pr of prs) {
        const reviews = await paginate(
            token,
            `${base}/pulls/${pr.number}/reviews`,
            isGitHubReview,
        );
        for (const review of reviews) {
            if (
                !review.user ||
                isBot(review.user) ||
                review.submitted_at === null
            )
                continue;
            reviewCount++;
            record(
                getOrAdd(byLogin, review.user, null),
                'pr_review',
                review.submitted_at,
            );
        }
    }
    log(`  ${reviewCount} PR reviews fetched.`);

    const contributors = [...byLogin.values()].sort((a, b) =>
        b.latest.localeCompare(a.latest),
    );

    log(`Done. Found ${contributors.length} unique contributors.`);
    return { created: new Date().toISOString(), contributors };
}

/** Title shared by detection and creation so the duplicate check can match an
 * existing PR by title regardless of its branch name. */
const PR_TITLE = 'Update contributors data';

/** GitHub returns 422 when a ref/PR already exists; tolerate that so duplicate
 * scheduled invocations converge instead of erroring (and triggering retries). */
function alreadyExists(e: unknown): boolean {
    return e instanceof Error && e.message.includes('GitHub API 422');
}

/** The generated file is committed, so it has to come out of here already
 * matching the repo's prettier config (4-space indent, trailing newline) — the
 * bot's PR can't run the formatter, and an unformatted file fails the PR's
 * format check. `contributorsFormat.test.ts` checks this against prettier. */
export function serializeContributors(data: ContributorsData): string {
    return `${JSON.stringify(data, null, 4)}\n`;
}

export async function createContributorsPR(
    token: string,
    data: ContributorsData,
): Promise<void> {
    const base = REPO_BASE;
    // Deterministic, week-stable branch name (one per day the job runs) so that
    // duplicate scheduled invocations — Pub/Sub delivers at-least-once and may
    // run the handler concurrently — converge on a single branch and PR rather
    // than each minting a unique timestamped branch.
    const branch = `contributors-update-${data.created.slice(0, 10)}`;
    const filePath = 'src/routes/[[locale]]/thanks/contributors.json';
    const content = Buffer.from(serializeContributors(data)).toString('base64');

    // Bail if any auto-generated contributors PR is already open. Matching by
    // title (not just this branch's head) catches a duplicate opened by a
    // separate invocation whose branch is named differently — e.g. a stale
    // function deployment still minting timestamped branches — which a
    // head-only check would miss.
    const open = await githubFetch(
        token,
        `${base}/pulls?base=main&state=open&per_page=100`,
    );
    if (
        Array.isArray(open) &&
        open.some((pr) => isRecord(pr) && pr.title === PR_TITLE)
    )
        return;

    const ref = await githubFetch(token, `${base}/git/ref/heads/main`);
    if (!isGitRef(ref)) throw new Error('Could not read the main branch');

    // Create the branch, tolerating a concurrent invocation that already made it.
    try {
        await githubFetch(token, `${base}/git/refs`, {
            method: 'POST',
            body: JSON.stringify({
                ref: `refs/heads/${branch}`,
                sha: ref.object.sha,
            }),
        });
    } catch (e) {
        if (!alreadyExists(e)) throw e;
    }

    // Read the existing blob SHA from the branch (not main): a concurrent run may
    // have already committed there, and PUT needs the current SHA to avoid 409.
    let existingSha: string | undefined;
    try {
        const existing = await githubFetch(
            token,
            `${base}/contents/${filePath}?ref=${branch}`,
        );
        // A shape with no sha is treated like an absent file; the PUT below
        // then reports the conflict rather than this guessing.
        if (isRecord(existing) && typeof existing.sha === 'string')
            existingSha = existing.sha;
    } catch {
        // File doesn't exist on the branch yet
    }

    await githubFetch(token, `${base}/contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
            message: `Update contributors data (${data.created.slice(0, 10)})`,
            content,
            branch,
            ...(existingSha ? { sha: existingSha } : {}),
        }),
    });

    // Create the PR, tolerating a concurrent invocation that already opened one.
    try {
        await githubFetch(token, `${base}/pulls`, {
            method: 'POST',
            body: JSON.stringify({
                title: PR_TITLE,
                head: branch,
                base: 'main',
                body: `Automated refresh of \`${filePath}\` generated on ${data.created}.`,
            }),
        });
    } catch (e) {
        if (!alreadyExists(e)) throw e;
    }
}
