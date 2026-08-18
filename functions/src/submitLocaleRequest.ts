/**
 * Cloud Function that turns a user's request for an unsupported language/region
 * into a GitHub Issue on `wordplaydev/wordplay`.
 *
 * Inputs
 *  - `language`: ISO 639-1 alpha-2 lowercase code (e.g. "pt").
 *  - `region`:   ISO 3166-1 alpha-2 uppercase code (e.g. "BR").
 *
 * Output
 *  - `issueUrl`: URL of the resulting GitHub Issue on success.
 *  - `existing`: true when that issue already existed rather than being created.
 *
 * Modeled on `submitLocalization.ts`. Uses the same `GITHUB_TOKEN` env var
 * and the same CORS allow-list.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REPO_OWNER = 'wordplaydev';
const REPO_NAME = 'wordplay';
const GITHUB_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

const cors = {
    cors: [
        '/firebase\.com$/',
        '/127.0.0.1*/',
        'http://localhost:5173',
        'https://test.wordplay.dev',
        'https://wordplay.dev',
    ],
};

export type SubmitLocaleRequestInputs = {
    language: string;
    region: string;
};

export type SubmitLocaleRequestOutput = {
    issueUrl: string;
    /** True when an open or closed issue already requested this locale, and
     *  `issueUrl` points at that one rather than a newly created issue. */
    existing?: boolean;
};

/** ISO 639-1 alpha-2: two lowercase letters. */
const LANGUAGE_PATTERN = /^[a-z]{2}$/;
/** ISO 3166-1 alpha-2: two uppercase letters. */
const REGION_PATTERN = /^[A-Z]{2}$/;

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

/** Try to resolve a language or region code to its English display name. */
function nameOf(type: 'language' | 'region', code: string): string {
    try {
        const display = new Intl.DisplayNames(['en'], { type });
        return display.of(code) ?? code;
    } catch {
        return code;
    }
}

/** An issue this repo's own request form created, as the issues endpoint returns it.
 *  `pull_request` is present only on pull requests, which that endpoint also lists. */
type IssueSummary = {
    title?: unknown;
    html_url?: unknown;
    pull_request?: unknown;
};

/**
 * The URL of an existing request for this locale, if there is one. We match on the
 * parenthesized locale code the title already carries rather than the language name,
 * because `Intl.DisplayNames` output shifts with ICU updates while the code does not.
 *
 * Both states are searched: a closed request is still the right place to discuss the
 * locale, and reopening beats filing a second issue. Failing to find one is not an
 * error — we would rather post a duplicate than lose the request, so callers treat a
 * throw here as "no match".
 */
async function findExistingRequest(
    token: string,
    locale: string,
): Promise<string | undefined> {
    // Two pages is plenty: only this form applies both labels, and it would take 200
    // locale requests to overflow. Stopping early keeps a slow GitHub from timing out
    // the callable.
    for (let page = 1; page <= 2; page++) {
        const issues = await githubFetch(
            token,
            `${GITHUB_BASE}/issues?state=all&labels=localization,request&per_page=100&page=${page}`,
        );
        if (!Array.isArray(issues) || issues.length === 0) return undefined;
        for (const issue of issues as IssueSummary[]) {
            if (issue.pull_request !== undefined) continue;
            if (
                typeof issue.title === 'string' &&
                issue.title.includes(`(${locale})`) &&
                typeof issue.html_url === 'string'
            )
                return issue.html_url;
        }
        if (issues.length < 100) return undefined;
    }
    return undefined;
}

function composeIssueBody(args: {
    contributor: { uid: string; name: string | null; email: string | null };
    locale: string;
    languageName: string;
    regionName: string;
}): string {
    const { contributor, locale, languageName, regionName } = args;
    const [language, region] = locale.split('-');
    const who =
        contributor.name ??
        contributor.email ??
        `user ${contributor.uid.slice(0, 8)}`;
    return [
        `A Wordplay user has requested support for a new language and region.`,
        ``,
        `- **Locale code**: \`${locale}\``,
        `- **Language**: ${languageName} (\`${language}\`)`,
        `- **Region**: ${regionName} (\`${region}\`)`,
        `- **Requested by**: ${who} (uid \`${contributor.uid}\`)`,
        ``,
        `Steps to add this locale:`,
        ``,
        `1. Add \`'${locale}'\` to \`DraftLocales\` in [\`src/locale/SupportedLocales.ts\`](https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/src/locale/SupportedLocales.ts).`,
        `2. Run \`npm run locales-translate ${locale}\` to generate the locale, tutorial, and how-to files.`,
        `3. Open a PR with the new files.`,
        ``,
        `_Generated by the locale-request form in the language picker dialog._`,
    ].join('\n');
}

export const submitLocaleRequest = onCall<
    SubmitLocaleRequestInputs,
    Promise<SubmitLocaleRequestOutput>
>(cors, async (request) => {
    if (!request.auth)
        throw new HttpsError(
            'unauthenticated',
            'Sign in before requesting a language.',
        );

    const { language, region } = request.data;

    if (typeof language !== 'string' || !LANGUAGE_PATTERN.test(language))
        throw new HttpsError(
            'invalid-argument',
            `Invalid language: ${language}`,
        );
    if (typeof region !== 'string' || !REGION_PATTERN.test(region))
        throw new HttpsError('invalid-argument', `Invalid region: ${region}`);

    const locale = `${language}-${region}`;
    const languageName = nameOf('language', language);
    const regionName = nameOf('region', region);

    const token = process.env.GITHUB_TOKEN;
    if (!token)
        throw new HttpsError(
            'failed-precondition',
            'GITHUB_TOKEN is not configured on the server.',
        );

    const userRecord = await (
        await import('firebase-admin/auth')
    )
        .getAuth()
        .getUser(request.auth.uid)
        .catch(() => undefined);
    const contributor = {
        uid: request.auth.uid,
        name: userRecord?.displayName ?? request.auth.token.name ?? null,
        email: userRecord?.email ?? request.auth.token.email ?? null,
    };

    const title = `Add support for ${languageName} (${locale})`;
    const body = composeIssueBody({
        contributor,
        locale,
        languageName,
        regionName,
    });

    // In the emulator we don't actually open an issue — just log it and hand
    // back a fake URL so the client UI exercises the same code path.
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(
            [
                '',
                '═══════════════════════════════════════════════════════════',
                ' Locale request — emulator dry run (no issue created)',
                '═══════════════════════════════════════════════════════════',
                `Title:  ${title}`,
                '',
                '--- Issue body ---',
                body,
                '--- end issue body ---',
                '═══════════════════════════════════════════════════════════',
                '',
            ].join('\n'),
        );
        return { issueUrl: `emulator://dry-run/${locale}`, existing: false };
    }

    // Don't open a second issue for a locale someone already asked for; point the
    // requester at the existing discussion instead. A failed search falls through to
    // creating one, since losing the request is worse than a duplicate.
    const existing = await findExistingRequest(token, locale).catch((error) => {
        console.error('Locale request duplicate check failed', error);
        return undefined;
    });
    if (existing !== undefined) return { issueUrl: existing, existing: true };

    const issue = (await githubFetch(token, `${GITHUB_BASE}/issues`, {
        method: 'POST',
        body: JSON.stringify({
            title,
            body,
            labels: ['localization', 'request'],
        }),
    })) as { html_url: string };

    return { issueUrl: issue.html_url };
});
