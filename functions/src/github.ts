import { isRecord } from './shared/guards.js';

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

/** Whether a GitHub API value is a user. */
export function isGitHubUser(value: unknown): value is GitHubUser {
    return (
        isRecord(value) &&
        typeof value.login === 'string' &&
        typeof value.avatar_url === 'string' &&
        typeof value.html_url === 'string'
    );
}

/** Whether a GitHub API value is a user or the null the API sends for a
 *  deleted account. */
export function isGitHubUserOrNull(value: unknown): value is GitHubUser | null {
    return value === null || isGitHubUser(value);
}

/** Whether a GitHub API value carries an `html_url`, which is what a caller
 *  that creates something reports back. */
export function hasHtmlUrl(value: unknown): value is { html_url: string } {
    return isRecord(value) && typeof value.html_url === 'string';
}

/** Whether a GitHub API value is a git ref, which names its commit's sha. */
export function isGitRef(value: unknown): value is { object: { sha: string } } {
    return (
        isRecord(value) &&
        isRecord(value.object) &&
        typeof value.object.sha === 'string'
    );
}

/** The headers every GitHub request carries, over any the caller adds. */
export function githubHeaders(token: string, extra?: HeadersInit): Headers {
    const headers = new Headers(extra);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('X-GitHub-Api-Version', '2022-11-28');
    headers.set('Content-Type', 'application/json');
    return headers;
}

export async function githubFetch(
    token: string,
    url: string,
    options?: RequestInit,
): Promise<unknown> {
    const response = await fetch(url, {
        ...options,
        headers: githubHeaders(token, options?.headers),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub API ${response.status} at ${url}: ${text}`);
    }
    // Some write endpoints (e.g. DELETE) return empty bodies; tolerate them.
    const text = await response.text();
    return text.length > 0 ? JSON.parse(text) : undefined;
}

/** Every page of a list endpoint, keeping only the items the guard admits:
 *  the API's shape is checked, not assumed, and an item it can't read is
 *  dropped with a warning rather than crashing the job. */
export async function paginate<T>(
    token: string,
    url: string,
    isItem: (value: unknown) => value is T,
): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; ; page++) {
        const sep = url.includes('?') ? '&' : '?';
        const chunk = await githubFetch(
            token,
            `${url}${sep}per_page=100&page=${page}`,
        );
        if (!Array.isArray(chunk) || chunk.length === 0) break;
        const kept = chunk.filter(isItem);
        if (kept.length < chunk.length)
            console.warn(
                `${chunk.length - kept.length} of ${chunk.length} items from ${url} had an unexpected shape`,
            );
        all.push(...kept);
        if (chunk.length < 100) break;
    }
    return all;
}

export function isBot(user: GitHubUser): boolean {
    return user.login.endsWith('[bot]');
}
