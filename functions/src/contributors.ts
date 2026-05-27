const REPO_OWNER = 'wordplaydev';
const REPO_NAME = 'wordplay';

type GitHubUser = { login: string; avatar_url: string; html_url: string };

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
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
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

async function githubFetch(
    token: string,
    url: string,
    options?: RequestInit,
): Promise<unknown> {
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...(options?.headers as Record<string, string> | undefined),
        },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API ${response.status} at ${url}: ${text}`);
    }
    return response.json();
}

async function paginate<T>(token: string, url: string): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; ; page++) {
        const sep = url.includes('?') ? '&' : '?';
        const chunk = (await githubFetch(
            token,
            `${url}${sep}per_page=100&page=${page}`,
        )) as T[];
        if (!Array.isArray(chunk) || chunk.length === 0) break;
        all.push(...chunk);
        if (chunk.length < 100) break;
    }
    return all;
}

function isBot(user: GitHubUser): boolean {
    return user.login.endsWith('[bot]');
}

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
    const base = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
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
        record(
            getOrAdd(byLogin, pr.user, null),
            'pull_request',
            pr.created_at,
        );
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

export async function createContributorsPR(
    token: string,
    data: ContributorsData,
): Promise<void> {
    const base = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
    const branch = `contributors-update-${Date.now()}`;
    const filePath = 'src/routes/[[locale]]/thanks/contributors.json';
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString(
        'base64',
    );

    const ref = (await githubFetch(token, `${base}/git/ref/heads/main`)) as {
        object: { sha: string };
    };

    await githubFetch(token, `${base}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: ref.object.sha,
        }),
    });

    let existingSha: string | undefined;
    try {
        const existing = (await githubFetch(
            token,
            `${base}/contents/${filePath}?ref=main`,
        )) as { sha: string };
        existingSha = existing.sha;
    } catch {
        // File doesn't exist yet
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

    await githubFetch(token, `${base}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
            title: 'Update contributors data',
            head: branch,
            base: 'main',
            body: `Automated refresh of \`static/contributors.json\` generated on ${data.created}.`,
        }),
    });
}
