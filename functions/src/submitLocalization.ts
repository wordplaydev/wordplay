/**
 * Cloud Function that turns a contributor's bundle of locale/tutorial edits
 * into a GitHub pull request against `wordplaydev/wordplay`.
 *
 * Inputs
 *  - `locale`: BCP-47 locale code the edits target (e.g. "fr-FR").
 *  - `description`: contributor's free-text rationale for the batch.
 *  - `edits`: map of override-key → revised value. Keys come from the same
 *    `LocalizationDexie` table the client uses, so they cover both regular
 *    locale paths (e.g. `ui.dialog.share.header`) and tutorial paths
 *    (e.g. `tutorial.acts.0.scenes.1.title`). A trailing numeric segment on a
 *    regular locale key indicates a tuple-element edit (e.g. `…labels.0`). A
 *    list value replaces a whole leaf, which only a path a locale writes for
 *    itself may take — see `isListEditPath`.
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

import { HttpsError, onCall } from 'firebase-functions/v2/https';
import prettier from 'prettier';
import type { StringAnalysis } from 'shared-types';
import { analyze } from './analyzeLocalization.js';
import {
    englishDisplay,
    isListEditPath,
    listDisplay,
    parseOverrideKey,
    resolveAtPath,
    setAtPath,
} from './localeEditPaths.js';

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
    edits: Record<string, string | string[]>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** Read a locale JSON's glossary words and their other written forms
 *  ({ id: { word, forms?, definition } }) for the literal-term check, tolerating
 *  any shape (returns [] if absent/malformed). */
function extractGlossaryWords(
    json: Record<string, unknown> | undefined,
): { id: string; word: string; forms?: string[] }[] {
    if (json === undefined || !isRecord(json.glossary)) return [];
    const out: { id: string; word: string; forms?: string[] }[] = [];
    for (const id of Object.keys(json.glossary)) {
        const entry = json.glossary[id];
        if (isRecord(entry) && typeof entry.word === 'string') {
            const forms = entry.forms;
            out.push({
                id,
                word: entry.word,
                ...(Array.isArray(forms) &&
                forms.every((form) => typeof form === 'string')
                    ? { forms }
                    : {}),
            });
        }
    }
    return out;
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

/** A reviewer-facing quality note for one string: a reading-level flag and any
 *  glossary terms that should become symbolic `$term` references. */
function qualityCell(analysis: StringAnalysis | undefined): string {
    if (analysis === undefined) return '';
    const parts: string[] = [];
    if (analysis.complex)
        parts.push(
            `⚠ reading level${analysis.readingLevelNote ? `: ${analysis.readingLevelNote}` : ''}`,
        );
    if (analysis.literalTerms.length > 0)
        parts.push(
            `use ${analysis.literalTerms.map((t) => `$${t.id}`).join(', ')}`,
        );
    return parts.length > 0 ? escapeCell(truncate(parts.join('; '), 240)) : '✓';
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
        analysis?: StringAnalysis;
    }[];
}): string {
    const { contributor, locale, description, rows } = args;
    const who =
        contributor.name ??
        contributor.email ??
        `user ${contributor.uid.slice(0, 8)}`;

    // Only show quality columns/summary when analysis succeeded (graceful
    // degrade: a failed analysis renders exactly the original table).
    const analyses = rows
        .map((r) => r.analysis)
        .filter((a): a is StringAnalysis => a !== undefined);
    const hasAnalysis = analyses.length > 0;
    const complexCount = analyses.filter((a) => a.complex).length;
    const literalCount = analyses.reduce(
        (n, a) => n + a.literalTerms.length,
        0,
    );

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
        ...(hasAnalysis
            ? [
                  `### Quality`,
                  ``,
                  `- Strings above ~6th-grade reading level: **${complexCount}**`,
                  `- Glossary terms that could be symbolic \`$term\` references: **${literalCount}**`,
                  ``,
              ]
            : []),
        `### Edits`,
        ``,
        hasAnalysis
            ? `| Key | Original English | Edited (\`${locale}\`) | Backtranslation to English | Quality |`
            : `| Key | Original English | Edited (\`${locale}\`) | Backtranslation to English |`,
        hasAnalysis
            ? `|-----|------------------|------------------------|----------------------------|---------|`
            : `|-----|------------------|------------------------|----------------------------|`,
        ...rows.map((r) => {
            const base = `| \`${escapeCell(r.key)}\` | ${escapeCell(
                truncate(r.sourceEnglish),
            )} | ${escapeCell(truncate(r.edited))} | ${escapeCell(
                truncate(r.backtranslation),
            )} |`;
            return hasAnalysis ? `${base} ${qualityCell(r.analysis)} |` : base;
        }),
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

    if (
        typeof locale !== 'string' ||
        !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale)
    )
        throw new HttpsError('invalid-argument', `Invalid locale: ${locale}`);
    if (typeof description !== 'string')
        throw new HttpsError(
            'invalid-argument',
            'description must be a string.',
        );
    if (description.length > LIMITS.maxDescriptionLength)
        throw new HttpsError('invalid-argument', 'description is too long.');
    if (typeof edits !== 'object' || edits === null || Array.isArray(edits))
        throw new HttpsError('invalid-argument', 'edits must be an object.');
    const entries = Object.entries(edits);
    if (entries.length === 0)
        throw new HttpsError('invalid-argument', 'No edits to submit.');
    if (entries.length > LIMITS.maxEdits)
        throw new HttpsError(
            'invalid-argument',
            'Too many edits in one bundle.',
        );
    for (const [key, value] of entries) {
        // A list replaces a whole leaf; `setAtPath` decides which paths may
        // take one, and rejects every other.
        const items = Array.isArray(value) ? value : [value];
        if (items.some((item) => typeof item !== 'string'))
            throw new HttpsError(
                'invalid-argument',
                `Edit for "${key}" is not a string or a list of strings.`,
            );
        if (items.some((item) => item.length > LIMITS.maxValueLength))
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
    const localeEdits: { key: string; value: string | string[] }[] = [];
    const tutorialEdits: { key: string; value: string | string[] }[] = [];
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
        throw new HttpsError('internal', 'en-US source locale file not found.');

    // Apply edits to in-memory copies of the JSON. Throws on invalid paths.
    const summaryRows: {
        key: string;
        sourceEnglish: string;
        edited: string;
        /** True for a list a locale writes for itself. Such a row is left out
         *  of the analysis pass: back-translating and reading-level-scoring a
         *  word list says nothing, and en-US's list isn't its source. */
        ownList: boolean;
    }[] = [];

    try {
        for (const { key, value } of localeEdits) {
            const { path, index } = parseOverrideKey(key);
            const ownList = Array.isArray(value) && isListEditPath(path);
            // Read what the locale had before the write, since a list's "before"
            // is its own previous list rather than anything in en-US.
            const before = ownList
                ? listDisplay(resolveAtPath(targetLocaleFile!.json, path))
                : englishDisplay(
                      resolveAtPath(sourceLocaleFile.json, path),
                      index,
                  );
            setAtPath(targetLocaleFile!.json, path, index, value);
            summaryRows.push({
                key,
                sourceEnglish: before,
                edited: Array.isArray(value) ? listDisplay(value) : value,
                ownList,
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
                edited: Array.isArray(value) ? listDisplay(value) : value,
                ownList: false,
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

    // One Claude pass over the edited strings: back-translation (for non-English
    // locales) plus reading-level + glossary-symbolization analysis for review.
    // Null on any failure — the PR still opens, just without these aids.
    const analysis = await analyze({
        locale,
        sourceLocale: 'en-US',
        strings: summaryRows
            .filter((r) => !r.ownList)
            .map((r) => ({ key: r.key, text: r.edited })),
        glossary: extractGlossaryWords(targetLocaleFile?.json),
        backTranslate: locale !== 'en-US',
    });
    const analysisByKey = new Map(
        (analysis ?? []).map((a): [string, StringAnalysis] => [a.key, a]),
    );

    const rows = summaryRows.map((r) => {
        const a = analysisByKey.get(r.key);
        return {
            ...r,
            // A row left out of the analysis has no back-translation, which is
            // the honest thing to show for a word list nobody translated.
            backtranslation:
                locale === 'en-US' ? r.edited : (a?.backTranslation ?? ''),
            analysis: a,
        };
    });

    // Compose PR body using the contributor's auth context.
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
            ...files.map((f) => `  • ${f.path} (${f.content.length} bytes)`),
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
