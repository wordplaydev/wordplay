import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { isNonProdDeployment } from './prodOnly.js';

const Here = dirname(fileURLToPath(import.meta.url));

/** The env vars the guard consults, saved so a mutation can't leak: the suite
 * runs unisolated, so a stray project id would reach every later file. */
const EnvNames = ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'];
const Saved = { ...process.env };

afterEach(() => {
    for (const name of EnvNames) {
        const before = Saved[name];
        if (before === undefined) delete process.env[name];
        else process.env[name] = before;
    }
});

function setProject(value: string | undefined) {
    for (const name of EnvNames) delete process.env[name];
    if (value !== undefined) process.env.GCLOUD_PROJECT = value;
}

test('production is not a non-prod deployment', () => {
    setProject('wordplay-prod');
    expect(isNonProdDeployment()).toBe(false);
});

test('the test project is', () => {
    setProject('wordplay-dev');
    expect(isNonProdDeployment()).toBe(true);
});

test('an unknown project id is, so only prod ever acts', () => {
    setProject('demo-wordplay');
    expect(isNonProdDeployment()).toBe(true);
});

// A missing project env var must never silently disable the prod job, which is
// the only failure mode of this guard that nobody would notice.
test('a missing project id is not, so prod can never be disabled by accident', () => {
    setProject(undefined);
    expect(isNonProdDeployment()).toBe(false);
});

test('GOOGLE_CLOUD_PROJECT stands in when GCLOUD_PROJECT is unset', () => {
    setProject(undefined);
    process.env.GOOGLE_CLOUD_PROJECT = 'wordplay-dev';
    expect(isNonProdDeployment()).toBe(true);
});

/**
 * Scheduled entry points whose effects land outside their own project. A
 * convention check rather than a call test: importing these would pull in
 * `firebase-functions`, which the root `npm ci` never installs.
 */
const OutwardFacingSchedules = [
    'refreshContributors.ts',
    'tidyStaleAssignments.ts',
    'reviewAgesOfConsent.ts',
];

test.each(OutwardFacingSchedules)('%s consults the guard', (file) => {
    const source = readFileSync(join(Here, file), 'utf8');
    expect(source).toContain("from './prodOnly.js'");
    expect(source).toContain('isNonProdDeployment()');
});

/**
 * The digests are inline `onSchedule` handlers in `index.ts` rather than their
 * own modules, so the per-file check above can't see them: their block has to
 * be read out of the file it shares with everything else.
 */
const OutwardFacingInlineSchedules = ['emailReviewDigests', 'emailChatDigests'];

test.each(OutwardFacingInlineSchedules)(
    '%s consults the guard before sending',
    (name) => {
        const source = readFileSync(join(Here, 'index.ts'), 'utf8');
        const start = source.indexOf(`export const ${name} = onSchedule(`);
        expect(start).toBeGreaterThan(-1);
        const end = source.indexOf('\n);', start);
        expect(end).toBeGreaterThan(start);
        expect(source.slice(start, end)).toContain('isNonProdDeployment()');
    },
);

// The manual trigger is deliberately unguarded: sending real mail on purpose is
// one of the few things only a deployed test project can verify.
test('the manual digest trigger stays open', () => {
    const source = readFileSync(join(Here, 'index.ts'), 'utf8');
    const start = source.indexOf(
        'export const emailDigestsManual = onRequest(',
    );
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf('\n);', start);
    expect(source.slice(start, end)).not.toContain('isNonProdDeployment()');
});
