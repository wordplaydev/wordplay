/**
 * Cloud Function that turns a contributor's bundle of locale/tutorial edits
 * into a GitHub pull request against `wordplaydev/wordplay`.
 *
 * Inputs
 *  - `locale`: BCP-47 locale code the edits target (e.g. "fr-FR").
 *  - `description`: contributor's free-text rationale for the batch.
 *  - `edits`: map of override-key → revised string. Keys come from the same
 *    `LocalizationDexie` table the client uses, so they cover both regular
 *    locale paths (e.g. `ui.dialog.share.header`) and tutorial paths
 *    (e.g. `tutorial.acts.0.scenes.1.title`). A trailing numeric segment on a
 *    regular locale key indicates a tuple-element edit (e.g. `…labels.0`).
 *
 * Output
 *  - `prUrl`: URL of the resulting GitHub PR on success.
 *
 * The PR body includes the contributor's identity, the rationale, and a
 * per-edit summary table with the original English text, the edited text in
 * the target locale, and a Google-Translate backtranslation of the edited
 * text to English — so a maintainer reviewing the PR can spot deviations
 * without speaking the target language.
 *
 * Requires the `GITHUB_TOKEN` environment variable (already used by the
 * existing contributors PR function).
 */

import Translate from '@google-cloud/translate';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import prettier from 'prettier';

const REPO_OWNER = 'wordplaydev';
const REPO_NAME = 'wordplay';
const GITHUB_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const TUTORIAL_KEY_PREFIX = 'tutorial';

const cors = {
    cors: [
        '/firebase\.com$/',
        '/127.0.0.1*/',
        'http://localhost:5173',
        'https://test.wordplay.dev',
        'https://wordplay.dev',
    ],
};

export type SubmitLocalizationInputs = {
    locale: string;
    description: string;
    edits: Record<string, string>;
};

export type SubmitLocalizationOutput = {
    prUrl: string;
};

/** Defensive caps so a malformed (or malicious) submission can't run away. */
const LIMITS = {
    maxEdits: 1000,
    maxValueLength: 10000,
    maxDescriptionLength: 5000,
};

// ---------------------------------------------------------------------------
// JSON path utilities
// ---------------------------------------------------------------------------

/** Parse an override key into (basePath, optional tuple index). Mirrors the
 *  client-side parseOverrideKey: a trailing all-digit segment is treated as
 *  an array index. */
function parseOverrideKey(key: string): {
    path: string;
    index: number | undefined;
} {
    const lastDot = key.lastIndexOf('.');
    const tail = lastDot === -1 ? '' : key.slice(lastDot + 1);
    if (lastDot !== -1 && /^\d+$/.test(tail)) {
        return { path: key.slice(0, lastDot), index: parseInt(tail, 10) };
    }
    return { path: key, index: undefined };
}

/** Walk a record along dotted segments and return the leaf value, or undefined
 *  if any step fails. */
function resolveAtPath(
    root: Record<string, unknown>,
    path: string,
): unknown {
    let node: unknown = root;
    for (const seg of path.split('.').filter((s) => s.length > 0)) {
        if (typeof node !== 'object' || node === null) return undefined;
        node = (node as Record<string, unknown>)[seg];
    }
    return node;
}

/** Coerce a resolved en-US value into a single display string for the PR table.
 *  Locale leaves can be plain strings, tuple-element strings (selected by `index`),
 *  or paragraph arrays (`FormattedText[]`) edited as a single combined value — the
 *  last case has no index, so we join paragraphs with blank lines. Anything else
 *  (object, mismatched index, missing path) collapses to empty. */
function englishDisplay(value: unknown, index: number | undefined): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        if (index !== undefined) {
            const item = value[index];
            return typeof item === 'string' ? item : '';
        }
        if (value.every((v) => typeof v === 'string'))
            return value.join('\n\n');
    }
    return '';
}

/** Walk a record along dotted segments (and an optional tuple index) and
 *  assign `value`. Throws if the path doesn't exist; we'd rather fail loudly
 *  than silently drop a contributor's edit. Array assignments require the
 *  index to be in-bounds. */
function setAtPath(
    root: Record<string, unknown>,
    path: string,
    index: number | undefined,
    value: string,
): void {
    const segments = path.split('.').filter((s) => s.length > 0);
    if (segments.length === 0) throw new Error(`Empty path: ${path}`);
    let node: unknown = root;
    for (let i = 0; i < segments.length - 1; i++) {
        if (typeof node !== 'object' || node === null)
            throw new Error(`Cannot descend into ${segments.slice(0, i).join('.')}`);
        node = (node as Record<string, unknown>)[segments[i]];
    }
    if (typeof node !== 'object' || node === null)
        throw new Error(`Parent of ${path} is not an object`);
    const leafKey = segments[segments.length - 1];
    const parent = node as Record<string, unknown>;

    if (index === undefined) {
        parent[leafKey] = value;
        return;
    }

    const target = parent[leafKey];
    if (!Array.isArray(target))
        throw new Error(`${path} is not an array; can't set index ${index}`);
    if (index < 0 || index >= target.length)
        throw new Error(`Index ${index} out of bounds for ${path}`);
    target[index] = value;
}

// ---------------------------------------------------------------------------
// File path resolution
// ---------------------------------------------------------------------------

/** en-US is special: its locale JSON lives in `src/locale/`. All others live
 *  in `static/locales/{locale}/{locale}.json`. */
function localeFilePath(locale: string): string {
    if (locale === 'en-US') return 'src/locale/en-US.json';
    return `static/locales/${locale}/${locale}.json`;
}

/** Tutorial files all live under static/locales, including en-US. */
function tutorialFilePath(locale: string): string {
    return `static/locales/${locale}/${locale}-tutorial.json`;
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

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

type GitHubFile = { content: string; sha: string; encoding: string };

/** Fetch a file's JSON contents and its blob SHA from the repository's main
 *  branch. Returns undefined if the file doesn't exist (e.g., no tutorial yet
 *  for a new locale). */
async function fetchJsonFile(
    token: string,
    filePath: string,
): Promise<{ json: Record<string, unknown>; sha: string } | undefined> {
    try {
        const file = (await githubFetch(
            token,
            `${GITHUB_BASE}/contents/${encodeURIComponent(filePath).replace(
                /%2F/g,
                '/',
            )}?ref=main`,
        )) as GitHubFile;
        const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
        return { json: JSON.parse(decoded), sha: file.sha };
    } catch (e) {
        // 404 → file doesn't exist; surface other errors.
        if (e instanceof Error && /404/.test(e.message)) return undefined;
        throw e;
    }
}

/** Create a branch from main, write a set of files to it, and open a PR.
 *  Each file is committed individually (one commit per file) — small bundles
 *  produce a clean PR; large bundles produce a few extra commits but still
 *  one PR. */
async function createPullRequest(
    token: string,
    branch: string,
    title: string,
    body: string,
    files: { path: string; content: string; existingSha?: string }[],
    commitMessage: string,
): Promise<string> {
    const mainRef = (await githubFetch(
        token,
        `${GITHUB_BASE}/git/ref/heads/main`,
    )) as { object: { sha: string } };

    await githubFetch(token, `${GITHUB_BASE}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha: mainRef.object.sha,
        }),
    });

    for (const file of files) {
        const encodedPath = file.path
            .split('/')
            .map(encodeURIComponent)
            .join('/');
        const payload: Record<string, unknown> = {
            message: commitMessage,
            content: Buffer.from(file.content, 'utf-8').toString('base64'),
            branch,
        };
        if (file.existingSha !== undefined) payload.sha = file.existingSha;
        await githubFetch(token, `${GITHUB_BASE}/contents/${encodedPath}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }

    const pr = (await githubFetch(token, `${GITHUB_BASE}/pulls`, {
        method: 'POST',
        body: JSON.stringify({ title, head: branch, base: 'main', body }),
    })) as { html_url: string };

    return pr.html_url;
}

// ---------------------------------------------------------------------------
// Backtranslation
// ---------------------------------------------------------------------------

/** Translate a batch of strings via Google Cloud Translate. Returns an array
 *  of translations aligned with the input. Falls back to empty strings if the
 *  API fails — backtranslation is a courtesy for reviewers, not load-bearing. */
async function backtranslate(
    text: string[],
    fromLocale: string,
    toLocale: string,
): Promise<string[]> {
    if (text.length === 0) return [];
    if (fromLocale === toLocale) return text;
    try {
        const translator = new Translate.v2.Translate();
        const [translations] = await translator.translate(text, {
            from: fromLocale,
            to: toLocale,
        });
        return Array.isArray(translations) ? translations : [translations];
    } catch (e) {
        console.error('Backtranslation failed', e);
        return text.map(() => '');
    }
}

// ---------------------------------------------------------------------------
// PR body composition
// ---------------------------------------------------------------------------

/** Escape pipe characters so a cell doesn't break out of a Markdown table. */
function escapeCell(text: string): string {
    return text
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
        .replace(/`/g, '\\`');
}

/** Truncate long strings with an ellipsis so the PR body stays readable. */
function truncate(text: string, max = 200): string {
    return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

function composePrBody(args: {
    contributor: { uid: string; name: string | null; email: string | null };
    locale: string;
    description: string;
    rows: {
        key: string;
        sourceEnglish: string;
        edited: string;
        backtranslation: string;
    }[];
}): string {
    const { contributor, locale, description, rows } = args;
    const who =
        contributor.name ??
        contributor.email ??
        `user ${contributor.uid.slice(0, 8)}`;

    return [
        `## Submission`,
        ``,
        `**Contributor**: ${escapeCell(who)} (uid \`${contributor.uid}\`)`,
        `**Locale**: \`${locale}\``,
        `**Edits**: ${rows.length}`,
        ``,
        `### Rationale`,
        ``,
        description.trim().length > 0
            ? description
                  .trim()
                  .split('\n')
                  .map((l) => `> ${l}`)
                  .join('\n')
            : `_(no rationale provided)_`,
        ``,
        `### Edits`,
        ``,
        `| Key | Original English | Edited (\`${locale}\`) | Backtranslation to English |`,
        `|-----|------------------|------------------------|----------------------------|`,
        ...rows.map(
            (r) =>
                `| \`${escapeCell(r.key)}\` | ${escapeCell(
                    truncate(r.sourceEnglish),
                )} | ${escapeCell(truncate(r.edited))} | ${escapeCell(
                    truncate(r.backtranslation),
                )} |`,
        ),
        ``,
        `_Generated by the localization workspace._`,
    ].join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const submitLocalizationBundle = onCall<
    SubmitLocalizationInputs,
    Promise<SubmitLocalizationOutput>
>(cors, async (request) => {
    if (!request.auth)
        throw new HttpsError(
            'unauthenticated',
            'Sign in before submitting localization edits.',
        );

    const { locale, description, edits } = request.data;

    if (typeof locale !== 'string' || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale))
        throw new HttpsError('invalid-argument', `Invalid locale: ${locale}`);
    if (typeof description !== 'string')
        throw new HttpsError('invalid-argument', 'description must be a string.');
    if (description.length > LIMITS.maxDescriptionLength)
        throw new HttpsError('invalid-argument', 'description is too long.');
    if (typeof edits !== 'object' || edits === null || Array.isArray(edits))
        throw new HttpsError('invalid-argument', 'edits must be an object.');
    const entries = Object.entries(edits);
    if (entries.length === 0)
        throw new HttpsError('invalid-argument', 'No edits to submit.');
    if (entries.length > LIMITS.maxEdits)
        throw new HttpsError('invalid-argument', 'Too many edits in one bundle.');
    for (const [key, value] of entries) {
        if (typeof value !== 'string')
            throw new HttpsError(
                'invalid-argument',
                `Edit for "${key}" is not a string.`,
            );
        if (value.length > LIMITS.maxValueLength)
            throw new HttpsError(
                'invalid-argument',
                `Edit for "${key}" exceeds maximum length.`,
            );
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token)
        throw new HttpsError(
            'failed-precondition',
            'GITHUB_TOKEN is not configured on the server.',
        );

    // Split edits into locale vs tutorial groups by key prefix.
    const localeEdits: { key: string; value: string }[] = [];
    const tutorialEdits: { key: string; value: string }[] = [];
    for (const [key, value] of entries) {
        if (key.startsWith(`${TUTORIAL_KEY_PREFIX}.`))
            tutorialEdits.push({ key, value });
        else localeEdits.push({ key, value });
    }

    // Pull both target-locale files (we may not touch both) and the en-US
    // sources used for the "Original English" column.
    const [
        targetLocaleFile,
        targetTutorialFile,
        sourceLocaleFile,
        sourceTutorialFile,
    ] = await Promise.all([
        localeEdits.length > 0
            ? fetchJsonFile(token, localeFilePath(locale))
            : Promise.resolve(undefined),
        tutorialEdits.length > 0
            ? fetchJsonFile(token, tutorialFilePath(locale))
            : Promise.resolve(undefined),
        fetchJsonFile(token, localeFilePath('en-US')),
        tutorialEdits.length > 0
            ? fetchJsonFile(token, tutorialFilePath('en-US'))
            : Promise.resolve(undefined),
    ]);

    if (localeEdits.length > 0 && !targetLocaleFile)
        throw new HttpsError(
            'not-found',
            `Locale file not found for ${locale}.`,
        );
    if (tutorialEdits.length > 0 && !targetTutorialFile)
        throw new HttpsError(
            'not-found',
            `Tutorial file not found for ${locale}.`,
        );
    if (!sourceLocaleFile)
        throw new HttpsError(
            'internal',
            'en-US source locale file not found.',
        );

    // Apply edits to in-memory copies of the JSON. Throws on invalid paths.
    const summaryRows: {
        key: string;
        sourceEnglish: string;
        edited: string;
    }[] = [];

    try {
        for (const { key, value } of localeEdits) {
            const { path, index } = parseOverrideKey(key);
            setAtPath(targetLocaleFile!.json, path, index, value);
            const english = resolveAtPath(sourceLocaleFile.json, path);
            summaryRows.push({
                key,
                sourceEnglish: englishDisplay(english, index),
                edited: value,
            });
        }
        for (const { key, value } of tutorialEdits) {
            const tutorialPath = key.slice(TUTORIAL_KEY_PREFIX.length + 1);
            const { path, index } = parseOverrideKey(tutorialPath);
            setAtPath(targetTutorialFile!.json, path, index, value);
            const english = sourceTutorialFile
                ? resolveAtPath(sourceTutorialFile.json, path)
                : undefined;
            summaryRows.push({
                key,
                sourceEnglish: englishDisplay(english, index),
                edited: value,
            });
        }
    } catch (e) {
        throw new HttpsError(
            'failed-precondition',
            `Could not apply edits: ${
                e instanceof Error ? e.message : 'unknown error'
            }`,
        );
    }

    // Backtranslate each edited value into English for the reviewer.
    const backtranslations =
        locale === 'en-US'
            ? summaryRows.map((r) => r.edited)
            : await backtranslate(
                  summaryRows.map((r) => r.edited),
                  locale,
                  'en',
              );

    const rows = summaryRows.map((r, i) => ({
        ...r,
        backtranslation: backtranslations[i] ?? '',
    }));

    // Compose PR body using the contributor's auth context.
    const userRecord =
        await (await import('firebase-admin/auth'))
            .getAuth()
            .getUser(request.auth.uid)
            .catch(() => undefined);
    const contributor = {
        uid: request.auth.uid,
        name: userRecord?.displayName ?? request.auth.token.name ?? null,
        email: userRecord?.email ?? request.auth.token.email ?? null,
    };

    const branch = `localize/${locale}-${Date.now()}`;
    const title = `Localization edits for ${locale} (${rows.length} string${
        rows.length === 1 ? '' : 's'
    })`;
    const body = composePrBody({ contributor, locale, description, rows });

    // Format JSON with Prettier so the PR diff only shows the contributor's
    // text changes, not whitespace churn from re-serializing the file.
    //
    // Subtle: prettier's JSON formatter inspects the input layout to decide
    // whether short objects/arrays stay on one line. Feeding it a minified
    // `JSON.stringify(json)` makes it collapse everything that fits in 80
    // columns, producing a layout that differs from `npx prettier --write`
    // on the repo file (which sees the existing expanded layout and
    // preserves it). That diff manifests as massive line-break churn in
    // every PR. Pre-indenting the input with `JSON.stringify(json, null, 4)`
    // matches the reference layout — verified to round-trip the on-disk
    // files byte-for-byte.
    const formatJson = (json: Record<string, unknown>) =>
        prettier.format(JSON.stringify(json, null, 4), {
            parser: 'json',
            tabWidth: 4,
        });

    const files: { path: string; content: string; existingSha?: string }[] = [];
    if (targetLocaleFile)
        files.push({
            path: localeFilePath(locale),
            content: await formatJson(targetLocaleFile.json),
            existingSha: targetLocaleFile.sha,
        });
    if (targetTutorialFile)
        files.push({
            path: tutorialFilePath(locale),
            content: await formatJson(targetTutorialFile.json),
            existingSha: targetTutorialFile.sha,
        });

    // When running in the Functions emulator, do everything up to (but not
    // including) the PR creation: validate, fetch source files, apply edits,
    // backtranslate, compose the body. Then log the would-be PR summary and
    // return a fake URL so the client still sees a "success" round-trip. This
    // lets local development exercise the full pipeline without producing real
    // GitHub branches and PRs.
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const summary = [
            '',
            '═══════════════════════════════════════════════════════════',
            ' Localization submission — emulator dry run (no PR created)',
            '═══════════════════════════════════════════════════════════',
            `Branch:  ${branch}`,
            `Title:   ${title}`,
            `Files:   ${files.length}`,
            ...files.map(
                (f) => `  • ${f.path} (${f.content.length} bytes)`,
            ),
            '',
            '--- PR body ---',
            body,
            '--- end PR body ---',
            '═══════════════════════════════════════════════════════════',
            '',
        ].join('\n');
        console.log(summary);
        return { prUrl: `emulator://dry-run/${branch}` };
    }

    const prUrl = await createPullRequest(
        token,
        branch,
        title,
        body,
        files,
        `Localization edits for ${locale}`,
    );

    return { prUrl };
});
