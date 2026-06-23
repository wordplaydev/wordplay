import {
    githubFetch,
    isBot,
    paginate,
    REPO_BASE,
    REPO_OWNER,
    type GitHubUser,
} from './github.js';

type GitHubCommit = {
    html_url: string;
    author: GitHubUser | null;
    commit: { author: { name: string; date: string }; message: string };
};

type GitHubIssue = {
    number: number;
    html_url: string;
    title: string;
    created_at: string;
    user: GitHubUser | null;
    pull_request?: unknown;
};

type GitHubComment = {
    html_url: string;
    body: string;
    created_at: string;
    user: GitHubUser | null;
};

type GitHubReview = {
    html_url: string;
    body: string;
    state:
        | 'APPROVED'
        | 'CHANGES_REQUESTED'
        | 'COMMENTED'
        | 'DISMISSED'
        | 'PENDING';
    submitted_at: string | null;
    user: GitHubUser | null;
};

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
    if (!map.has(user.login)) {
        map.set(user.login, {
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
        });
    }
    return map.get(user.login)!;
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
    const commits = await paginate<GitHubCommit>(token, `${base}/commits`);
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
    const issues = await paginate<GitHubIssue>(
        token,
        `${base}/issues?state=all`,
    );
    log(`  ${issues.length} issues fetched.`);
    for (const issue of issues) {
        if (!issue.user || issue.pull_request || isBot(issue.user)) continue;
        record(getOrAdd(byLogin, issue.user, null), 'issue', issue.created_at);
    }

    log('Fetching pull requests...');
    const prs = await paginate<GitHubIssue>(token, `${base}/pulls?state=all`);
    log(`  ${prs.length} pull requests fetched.`);
    for (const pr of prs) {
        if (!pr.user || isBot(pr.user)) continue;
        record(getOrAdd(byLogin, pr.user, null), 'pull_request', pr.created_at);
    }

    log('Fetching issue comments...');
    const comments = await paginate<GitHubComment>(
        token,
        `${base}/issues/comments`,
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
    const reviewComments = await paginate<GitHubComment>(
        token,
        `${base}/pulls/comments`,
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
        const reviews = await paginate<GitHubReview>(
            token,
            `${base}/pulls/${pr.number}/reviews`,
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

/** GitHub returns 422 when a ref/PR already exists; tolerate that so duplicate
 * scheduled invocations converge instead of erroring (and triggering retries). */
function alreadyExists(e: unknown): boolean {
    return e instanceof Error && e.message.includes('GitHub API 422');
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
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString(
        'base64',
    );

    // If a PR for this branch is already open, this invocation is a duplicate.
    const open = await githubFetch(
        token,
        `${base}/pulls?head=${REPO_OWNER}:${branch}&state=open`,
    );
    if (Array.isArray(open) && open.length > 0) return;

    const ref = (await githubFetch(token, `${base}/git/ref/heads/main`)) as {
        object: { sha: string };
    };

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
        const existing = (await githubFetch(
            token,
            `${base}/contents/${filePath}?ref=${branch}`,
        )) as { sha: string };
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
                title: 'Update contributors data',
                head: branch,
                base: 'main',
                body: `Automated refresh of \`static/contributors.json\` generated on ${data.created}.`,
            }),
        });
    } catch (e) {
        if (!alreadyExists(e)) throw e;
    }
}
