/** Shared GitHub REST API helpers used by the contributors refresh and the
 * stale-assignment tidy bot. */

export const REPO_OWNER = 'wordplaydev';
export const REPO_NAME = 'wordplay';
export const REPO_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

export type GitHubUser = {
    login: string;
    avatar_url: string;
    html_url: string;
};

export async function githubFetch(
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
    // Some write endpoints (e.g. DELETE) return empty bodies; tolerate them.
    const text = await response.text();
    return text.length > 0 ? JSON.parse(text) : undefined;
}

export async function paginate<T>(token: string, url: string): Promise<T[]> {
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

export function isBot(user: GitHubUser): boolean {
    return user.login.endsWith('[bot]');
}
