/**
 * "Amy's GitHub bot": keeps issue assignments tidy.
 *
 * For each open issue with assignees, per assignee:
 *  - If the assignee hasn't touched the issue (comment or timeline change) for
 *    STALE_DAYS and we haven't already warned them, post a warning that tags them.
 *  - If we warned them GRACE_DAYS ago and they still haven't responded, unassign
 *    them and post a notice.
 *
 * The bot is stateless: it recognizes its own prior warnings by an HTML-comment
 * marker embedded in the comment body, so it stays idempotent across daily runs.
 */

import {
    githubFetch,
    isBot,
    paginate,
    REPO_BASE,
    type GitHubUser,
} from './github.js';

/** Days of assignee inactivity before the bot posts a warning. */
const STALE_DAYS = 21;
/** Days after a warning, with no response, before the bot unassigns. */
const GRACE_DAYS = 7;
/** Issues carrying this label are never touched by the bot. */
const OPT_OUT_LABEL = 'no-bot';
/** GitHub logins the bot will never warn or unassign. */
const MAINTAINERS: string[] = ['amyjko'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Timeline events that happen *to* a user rather than being an action they
 * took. The bot's own warning @-mentions the assignee, which makes GitHub emit
 * `mentioned` and `subscribed` events with the assignee as actor moments after
 * the warning — so counting them as activity makes every warned assignee look
 * like they replied instantly, and the bot never unassigns anyone. */
const PASSIVE_EVENTS = new Set(['mentioned', 'subscribed', 'unsubscribed']);

/** Marker hidden in warning comments so the bot can find its own warnings later,
 * and which assignees each warning covered. Rendered invisibly by GitHub. */
const MARKER_RE = /<!--\s*wp-stale-bot:warning\s+logins=(\S+)\s*-->/;

function warningMarker(logins: string[]): string {
    return `<!-- wp-stale-bot:warning logins=${logins.join(',')} -->`;
}

type GitHubLabel = { name: string };

type IssueSummary = {
    number: number;
    html_url: string;
    title: string;
    pull_request?: unknown;
    assignees: GitHubUser[] | null;
    labels: GitHubLabel[];
    created_at: string;
};

type IssueComment = {
    body: string | null;
    created_at: string;
    user: GitHubUser | null;
};

type TimelineEvent = {
    event: string;
    created_at?: string | null;
    actor?: GitHubUser | null;
    assignee?: GitHubUser | null;
};

export type TidyReport = {
    dryRun: boolean;
    checkedIssues: number;
    warned: { issue: number; logins: string[] }[];
    unassigned: { issue: number; logins: string[] }[];
};

/** Latest ISO timestamp in `times`, or null if empty. ISO-8601 UTC strings sort
 * lexicographically, matching chronological order. */
function latest(times: string[]): string | null {
    let max: string | null = null;
    for (const t of times) if (max === null || t > max) max = t;
    return max;
}

/** The most recent warning comment covering `login`, or null. */
function latestWarningFor(
    login: string,
    comments: IssueComment[],
): IssueComment | null {
    let found: IssueComment | null = null;
    for (const comment of comments) {
        const match = comment.body?.match(MARKER_RE);
        if (!match) continue;
        const logins = match[1].split(',');
        if (!logins.includes(login)) continue;
        if (found === null || comment.created_at > found.created_at)
            found = comment;
    }
    return found;
}

/** Most recent moment `login` touched the issue: assignment, comment, or any
 * timeline change they were the actor of. Falls back to issue creation so a
 * just-created assignment isn't treated as ancient. */
function lastActivityFor(
    login: string,
    issue: IssueSummary,
    comments: IssueComment[],
    timeline: TimelineEvent[],
): string {
    const times: string[] = [];

    // When they were (last) assigned — a floor on their staleness.
    for (const event of timeline)
        if (
            event.event === 'assigned' &&
            event.assignee?.login === login &&
            event.created_at
        )
            times.push(event.created_at);

    // Their comments.
    for (const comment of comments)
        if (comment.user?.login === login) times.push(comment.created_at);

    // Any timeline change they performed (labels, references, renames, ...).
    // Skip passive events (mentioned/subscribed) that GitHub attributes to the
    // user but which they didn't actually do — notably the ones triggered by
    // the bot's own warning mention.
    for (const event of timeline)
        if (
            event.actor?.login === login &&
            event.created_at &&
            !PASSIVE_EVENTS.has(event.event)
        )
            times.push(event.created_at);

    return latest(times) ?? issue.created_at;
}

async function postComment(
    token: string,
    issue: number,
    body: string,
): Promise<void> {
    await githubFetch(token, `${REPO_BASE}/issues/${issue}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
    });
}

async function unassign(
    token: string,
    issue: number,
    logins: string[],
): Promise<void> {
    await githubFetch(token, `${REPO_BASE}/issues/${issue}/assignees`, {
        method: 'DELETE',
        body: JSON.stringify({ assignees: logins }),
    });
}

function mention(logins: string[]): string {
    return logins.map((l) => `@${l}`).join(' ');
}

function warningBody(logins: string[]): string {
    return (
        `Hi! I'm Amy's GitHub bot. ${mention(logins)} — Are you still working ` +
        `on this issue? Can you post a status update, and if you won't finish ` +
        `it, can you unassign yourself? We'll unassign you in a week if we ` +
        `don't get a reply.\n\n${warningMarker(logins)}`
    );
}

function unassignBody(logins: string[]): string {
    return (
        `Hi, Amy's GitHub bot here. We didn't hear back from ` +
        `${mention(logins)}, so unassigning.`
    );
}

export async function tidyStaleAssignments(
    token: string,
    options: { dryRun: boolean },
    onProgress?: (msg: string) => void,
): Promise<TidyReport> {
    const log = onProgress ?? (() => undefined);
    const { dryRun } = options;
    const now = Date.now();

    const report: TidyReport = {
        dryRun,
        checkedIssues: 0,
        warned: [],
        unassigned: [],
    };

    log('Fetching open assigned issues...');
    const issues = await paginate<IssueSummary>(
        token,
        `${REPO_BASE}/issues?state=open&assignee=*`,
    );

    for (const issue of issues) {
        // Skip pull requests (the issues endpoint returns them too).
        if (issue.pull_request) continue;
        // Respect the opt-out label.
        if (issue.labels.some((label) => label.name === OPT_OUT_LABEL))
            continue;

        const assignees = (issue.assignees ?? []).filter(
            (user) => !isBot(user) && !MAINTAINERS.includes(user.login),
        );
        if (assignees.length === 0) continue;

        report.checkedIssues++;

        const comments = await paginate<IssueComment>(
            token,
            `${REPO_BASE}/issues/${issue.number}/comments`,
        );
        const timeline = await paginate<TimelineEvent>(
            token,
            `${REPO_BASE}/issues/${issue.number}/timeline`,
        );

        const toWarn: string[] = [];
        const toUnassign: string[] = [];

        for (const user of assignees) {
            const login = user.login;
            const activity = lastActivityFor(login, issue, comments, timeline);
            const warning = latestWarningFor(login, comments);

            // A warning is "open" if they haven't acted since it was posted.
            if (warning && activity <= warning.created_at) {
                const graceMs = now - Date.parse(warning.created_at);
                if (graceMs >= GRACE_DAYS * DAY_MS) toUnassign.push(login);
                // else: still within the grace period — wait.
            } else {
                const idleMs = now - Date.parse(activity);
                if (idleMs >= STALE_DAYS * DAY_MS) toWarn.push(login);
                // else: still active recently — leave alone.
            }
        }

        if (toWarn.length > 0) {
            log(
                `#${issue.number}: warning ${toWarn.join(', ')}${dryRun ? ' (dry run)' : ''}`,
            );
            if (!dryRun)
                await postComment(token, issue.number, warningBody(toWarn));
            report.warned.push({ issue: issue.number, logins: toWarn });
        }

        if (toUnassign.length > 0) {
            log(
                `#${issue.number}: unassigning ${toUnassign.join(', ')}${dryRun ? ' (dry run)' : ''}`,
            );
            if (!dryRun) {
                await unassign(token, issue.number, toUnassign);
                await postComment(
                    token,
                    issue.number,
                    unassignBody(toUnassign),
                );
            }
            report.unassigned.push({ issue: issue.number, logins: toUnassign });
        }
    }

    log(
        `Done. Checked ${report.checkedIssues} issue(s); ` +
            `warned ${report.warned.length}, unassigned ${report.unassigned.length}.`,
    );
    return report;
}
