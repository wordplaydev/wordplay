import {
    AgeOfConsentReviewed,
    AgesOfConsent,
    type Consent,
} from './ageOfConsent.js';
import { paginate, githubFetch, REPO_BASE } from './github.js';

/**
 * Once a year, open an issue asking someone to re-check the age-of-consent
 * table (#628).
 *
 * The table is law, and law moves — Australia raised its threshold while #628
 * was open and Brazil's Digital ECA became enforceable in March 2026. A stale
 * row is silent: nobody sees an error, a 14-year-old in a country that moved to
 * 16 is simply offered an account they should not have been. So the reminder
 * has to reach a person.
 *
 * Deliberately an issue rather than a failing test. A test that goes red on a
 * date fails for whichever contributor happens to pull next, about something
 * they did not touch and cannot fix — the same reason the delimiter-drift and
 * glossary-word backlogs warn rather than fail while a human backlog stands.
 */

/** How long a row may go unchecked before it is worth re-reading. */
export const ReviewIntervalMonths = 12;

export type StaleRow = Consent & {
    region: string;
    /** Why it's listed: nobody has looked in a year, or the reading is contested. */
    reason: 'aged' | 'uncertain';
};

function addMonths(iso: string, months: number): number | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (match === null) return undefined;
    const [year, month, day] = match.slice(1).map(Number);
    return Date.UTC(year, month - 1 + months, day);
}

/** The rows worth re-reading, oldest first. A row can be listed for either
 *  reason, and an unparseable `checked` date counts as aged rather than being
 *  skipped — a malformed date is exactly the kind of thing to look at. */
export function staleAgesOfConsent(now: number): StaleRow[] {
    const rows: StaleRow[] = [];
    for (const [region, entry] of Object.entries(AgesOfConsent)) {
        const due = addMonths(entry.checked, ReviewIntervalMonths);
        const aged = due === undefined || due <= now;
        if (aged || entry.uncertain !== undefined)
            rows.push({
                ...entry,
                region,
                reason: aged ? 'aged' : 'uncertain',
            });
    }
    return rows.sort(
        (a, b) =>
            a.checked.localeCompare(b.checked) ||
            a.region.localeCompare(b.region),
    );
}

/** Carries the year, so a retry within one year finds the existing issue and a
 *  new year opens a fresh one. */
export function reviewIssueTitle(now: number): string {
    return `Review the age-of-consent table (${new Date(now).getUTCFullYear()})`;
}

export function reviewIssueBody(rows: StaleRow[], now: number): string {
    const aged = rows.filter((r) => r.reason === 'aged');
    const uncertain = rows.filter((r) => r.reason === 'uncertain');
    const lines = [
        `The table in \`functions/src/ageOfConsent.ts\` decides who may sign in with an email address rather than a password (#628). It was last reviewed end to end on **${AgeOfConsentReviewed}**.`,
        '',
        'A stale row is silent — nobody sees an error, someone is simply offered an account they should not have been, or refused one they were entitled to. Please re-read the rows below against their sources, update `age`, `source`, and `checked`, and bump `AgeOfConsentReviewed`.',
        '',
    ];
    if (aged.length > 0) {
        lines.push(
            `### Not checked in ${ReviewIntervalMonths} months (${aged.length})`,
            '',
            '| Region | Age | Source | Checked |',
            '| --- | --- | --- | --- |',
            ...aged.map(
                (r) =>
                    `| ${r.region} | ${r.age} | ${r.source} | ${r.checked} |`,
            ),
            '',
        );
    }
    if (uncertain.length > 0) {
        lines.push(
            `### Flagged uncertain (${uncertain.length})`,
            '',
            ...uncertain.map(
                (r) =>
                    `- **${r.region}** (${r.age}, ${r.source}) — ${r.uncertain}`,
            ),
            '',
        );
    }
    lines.push(
        '### Also worth re-checking',
        '',
        '- Whether any region *not* listed has moved off the default of 13. The table is exceptions only, so a country that newly raised its age has no row to go stale.',
        '- GDPR Article 8 lets each member state re-pick between 13 and 16 at any time.',
        '',
        '_Opened automatically by `reviewAgesOfConsent`._',
    );
    return lines.join('\n');
}

/** Open the issue, unless one already exists for this year. */
export async function reviewAgesOfConsent(
    token: string,
    options: { dryRun?: boolean; now?: number } = {},
    log: (message: string) => void = () => undefined,
): Promise<{ created: boolean; title: string; rows: StaleRow[] }> {
    const now = options.now ?? Date.now();
    const title = reviewIssueTitle(now);
    const rows = staleAgesOfConsent(now);

    if (rows.length === 0) {
        log('Every age-of-consent row is current and none is flagged.');
        return { created: false, title, rows };
    }

    // A cron that retries would otherwise post twice. Matching on title rather
    // than a label so a maintainer relabelling the issue doesn't cause a
    // duplicate next run.
    const open = (
        await paginate<{ title: string }>(
            token,
            `${REPO_BASE}/issues?state=open`,
        )
    ).filter((issue) => issue.title === title);
    if (open.length > 0) {
        log(`An issue titled "${title}" is already open.`);
        return { created: false, title, rows };
    }

    if (options.dryRun || process.env.FUNCTIONS_EMULATOR === 'true') {
        log(`Would open "${title}" listing ${rows.length} rows.`);
        return { created: false, title, rows };
    }

    await githubFetch(token, `${REPO_BASE}/issues`, {
        method: 'POST',
        body: JSON.stringify({
            title,
            body: reviewIssueBody(rows, now),
            labels: ['privacy', 'auth'],
        }),
    });
    log(`Opened "${title}" listing ${rows.length} rows.`);
    return { created: true, title, rows };
}

/** Scheduled entry point, honoring DRY_RUN from the env like the tidy pass. */
export default async function reviewAgesOfConsentScheduled(): Promise<void> {
    const report = await reviewAgesOfConsent(
        process.env.GITHUB_TOKEN ?? '',
        { dryRun: process.env.DRY_RUN === 'true' },
        (message) => console.log(message),
    );
    console.log('Age-of-consent review:', JSON.stringify(report));
}
