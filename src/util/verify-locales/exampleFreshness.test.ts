import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
    localeExamplesMayHaveChanged,
    resetExampleFreshness,
} from './exampleFreshness';

/**
 * These build a throwaway repository and run the predicate inside it, because
 * the thing under test is a claim about git. The failure that matters is the
 * unsafe one — reporting "unchanged" for something that did change, which would
 * silently skip verification — so every case that touches a relevant file
 * asserts `true`.
 */

let repo: string;

const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

const write = (file: string, text: string) => {
    fs.mkdirSync(path.join(repo, path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(repo, file), text);
};

beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'freshness-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    write('static/examples/Adventure.wp', 'master\n');
    write('static/examples/es-MX/Adventure.wp', 'localized\n');
    write('static/examples/fr-FR/Adventure.wp', 'localized\n');
    write('static/locales/es-MX/es-MX.json', '{}\n');
    write('static/locales/fr-FR/fr-FR.json', '{}\n');
    write('src/locale/en-US.json', '{}\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    process.env.WORDPLAY_LOCALES_BASE = git('rev-parse', 'HEAD').trim();
    // A second commit, so the base is genuinely behind HEAD.
    write('README.md', 'unrelated\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'unrelated');
    resetExampleFreshness();
});

afterEach(() => {
    delete process.env.WORDPLAY_LOCALES_BASE;
    fs.rmSync(repo, { recursive: true, force: true });
});

test('an unrelated change leaves every locale skippable', () => {
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(false);
    expect(localeExamplesMayHaveChanged('fr-FR', repo)).toBe(false);
});

describe('a change that can alter a retarget marks the locale changed', () => {
    test.each([
        ['a master example', 'static/examples/Adventure.wp'],
        ["the locale's own example", 'static/examples/es-MX/Adventure.wp'],
        ["the locale's names", 'static/locales/es-MX/es-MX.json'],
        ['the en-US names it resolves against', 'src/locale/en-US.json'],
    ])('%s', (_name, file) => {
        write(file, 'changed\n');
        git('add', '-A');
        git('commit', '-q', '-m', 'change');
        resetExampleFreshness();
        expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
    });
});

test('another locale is unaffected by a change to this one', () => {
    write('static/examples/es-MX/Adventure.wp', 'changed\n');
    write('static/locales/es-MX/es-MX.json', '{"changed":true}\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'change');
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
    expect(localeExamplesMayHaveChanged('fr-FR', repo)).toBe(false);
});

test('a master change reaches every locale', () => {
    write('static/examples/Adventure.wp', 'changed\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'change');
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
    expect(localeExamplesMayHaveChanged('fr-FR', repo)).toBe(true);
});

// The verifier runs in watch mode while someone edits, so an edit that hasn't
// been committed still has to count.
test('an uncommitted edit counts', () => {
    write('static/examples/es-MX/Adventure.wp', 'edited but not committed\n');
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
});

test('an untracked new example counts', () => {
    write('static/examples/es-MX/Brand.wp', 'brand new\n');
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
});

// Every fallback verifies rather than skips: the skip is the optimization.
test('no base means verify everything', () => {
    delete process.env.WORDPLAY_LOCALES_BASE;
    // Detach from any `main` so getDriftBase() cannot answer either.
    git('branch', '-m', 'main', 'elsewhere');
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
});

test('a base equal to HEAD means verify everything', () => {
    process.env.WORDPLAY_LOCALES_BASE = git('rev-parse', 'HEAD').trim();
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
});

test('a base git cannot resolve means verify everything', () => {
    process.env.WORDPLAY_LOCALES_BASE = 'not-a-real-ref';
    resetExampleFreshness();
    expect(localeExamplesMayHaveChanged('es-MX', repo)).toBe(true);
});
