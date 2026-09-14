/**
 * TypeScript's escape hatches — `as`, `!`, `any`, and `@ts-` directives — all
 * turn a compiler guarantee into a hope, and every one of them that shipped
 * here was eventually a crash. CLAUDE.md has said "never use `as`" for a long
 * time with nothing enforcing it, so this test is the enforcement: a new
 * assertion fails the build unless its author says in the source why it holds.
 *
 * The escape hatch is a `// sound: <reason>` comment on the statement. Prefer
 * a type guard or a helper from `src/util/nullable.ts` over a marker; a marker
 * is for the handful of places where the invariant is real but unexpressible.
 *
 * Known limitation: only a `.svelte` file's `<script>` blocks are parsed, so an
 * assertion written inside markup (`{x as T}`) would slip through. A regex scan
 * covers the obvious shape of that; nothing in the repo does it today.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

/**
 * How many marked-sound assertions the repo is allowed to carry. Ratchet this
 * down when one is removed; raising it means a reviewer agreed the invariant
 * cannot be expressed in the type system.
 */
const SoundBudget = 9;

/**
 * How many `as`/`any` uses remain in tests. A cast in a fixture makes a test
 * pass vacuously, so this is a debt counter that only ever goes down.
 */
const TestAssertionBudget = 0;

const root = resolve(__dirname, '../..');

/** The directories this convention governs. */
const Roots = ['src', 'functions/src', 'scripts'];

/** Files that are not ours to hold to it. */
const Skip = new Set([
    // This test names every construct it refuses, which would flag itself.
    'src/util/typeAssertionConvention.test.ts',
]);

type Finding = {
    path: string;
    line: number;
    kind: string;
    text: string;
    sound: boolean;
};

function sourceFilesUnder(directory: string): string[] {
    const files: string[] = [];
    for (const name of readdirSync(directory)) {
        if (name === 'node_modules' || name === 'lib' || name === 'build')
            continue;
        const path = join(directory, name);
        if (statSync(path).isDirectory()) files.push(...sourceFilesUnder(path));
        else if (
            (name.endsWith('.ts') || name.endsWith('.svelte')) &&
            !name.endsWith('.d.ts')
        )
            files.push(path);
    }
    return files;
}

/**
 * The TypeScript in a file, with the line each block starts on. A `.svelte`
 * file's blocks are parsed separately so an offset can put a finding on the
 * line it is actually written on.
 */
function blocksIn(
    path: string,
    text: string,
): { code: string; line: number }[] {
    if (!path.endsWith('.svelte')) return [{ code: text, line: 0 }];
    return Array.from(text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)).map(
        (match) => ({
            code: match[1] ?? '',
            // Lines before the block's content begins.
            line:
                text
                    .slice(0, (match.index ?? 0) + match[0].indexOf('>') + 1)
                    .split('\n').length - 1,
        }),
    );
}

/** A `// sound: <reason>` marker with a reason long enough to be one. */
const MarkerPattern = /\/\/\s*sound:\s*(.+)/;

function markerLinesIn(code: string): Set<number> {
    const lines = new Set<number>();
    code.split('\n').forEach((text, index) => {
        const match = MarkerPattern.exec(text);
        if (match && (match[1] ?? '').trim().length >= 10) lines.add(index);
    });
    return lines;
}

/** The statement a flagged node belongs to, so a marker above it covers it. */
function enclosingStatement(node: ts.Node): ts.Node {
    let current: ts.Node = node;
    while (current.parent !== undefined && !ts.isSourceFile(current.parent)) {
        if (ts.isStatement(current) || ts.isClassElement(current))
            return current;
        current = current.parent;
    }
    return current;
}

function findingsIn(path: string): Finding[] {
    const text = readFileSync(join(root, path), 'utf-8');
    const findings: Finding[] = [];
    const isTest = path.endsWith('.test.ts');
    for (const { code, line: offset } of blocksIn(path, text)) {
        const source = ts.createSourceFile(
            'file.ts',
            code,
            ts.ScriptTarget.Latest,
            true,
        );
        const markers = markerLinesIn(code);
        const lineOf = (position: number) =>
            source.getLineAndCharacterOfPosition(position).line;
        const covered = (node: ts.Node) => {
            const statement = enclosingStatement(node);
            const from = lineOf(statement.getFullStart());
            const to = lineOf(statement.getEnd());
            for (const marker of markers)
                if (marker >= from && marker <= to) return true;
            return false;
        };
        const flag = (node: ts.Node, kind: string) => {
            const at = lineOf(node.getStart(source));
            findings.push({
                path,
                line: offset + at + 1,
                kind,
                text: (code.split('\n')[at] ?? '').trim(),
                sound: covered(node),
            });
        };
        const visit = (node: ts.Node): void => {
            if (
                ts.isAsExpression(node) &&
                // `as const` asserts nothing; it narrows a literal.
                !(
                    ts.isTypeReferenceNode(node.type) &&
                    ts.isIdentifier(node.type.typeName) &&
                    node.type.typeName.text === 'const'
                )
            )
                flag(node, 'as');
            else if (ts.isTypeAssertionExpression(node)) flag(node, 'as');
            // A failing `!` in a test is a failing test, which is the point of a test.
            else if (ts.isNonNullExpression(node) && !isTest) flag(node, '!');
            else if (node.kind === ts.SyntaxKind.AnyKeyword) flag(node, 'any');
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(source, visit);

        // Directives are trivia, so they are read from the text rather than the tree.
        code.split('\n').forEach((content, index) => {
            const directive = /@ts-(ignore|nocheck|expect-error)/.exec(content);
            if (directive === null) return;
            // `@ts-expect-error` is a *check* in a test: it fails if the error stops happening.
            if (directive[1] === 'expect-error' && isTest) return;
            findings.push({
                path,
                line: offset + index + 1,
                kind: `@ts-${directive[1]}`,
                text: content.trim(),
                sound: false,
            });
        });
    }
    return findings;
}

function scan(): Finding[] {
    const findings: Finding[] = [];
    for (const directory of Roots)
        for (const path of sourceFilesUnder(join(root, directory))) {
            const relativePath = relative(root, path);
            if (Skip.has(relativePath)) continue;
            findings.push(...findingsIn(relativePath));
        }
    return findings;
}

const findings = scan();

function describe(list: Finding[]): string[] {
    return list
        .map(
            ({ path, line, kind, text }) => `${path}:${line} [${kind}] ${text}`,
        )
        .sort();
}

test('No unexplained type assertion, non-null assertion, or `any` outside tests', () => {
    const offenders = findings.filter(
        (finding) =>
            !finding.sound &&
            !(finding.path.endsWith('.test.ts') && finding.kind !== '!'),
    );
    expect(
        describe(offenders),
        'These sidestep the type system. Prefer a type guard (`value is T`), a schema `safeParse` at a data boundary, or a helper from `src/util/nullable.ts` (`first`, `last`, `isDefined`, `allDefined`, `must`). If the invariant is real but cannot be written as a type, add a `// sound: <why it holds>` comment on the statement and raise `SoundBudget` in this test.',
    ).toEqual([]);
});

test('No `as` or `any` in tests, where a cast makes an assertion pass vacuously', () => {
    const offenders = findings.filter(
        (finding) =>
            finding.path.endsWith('.test.ts') &&
            (finding.kind === 'as' || finding.kind === 'any'),
    );
    expect(
        offenders.length,
        `${describe(offenders).join('\n')}\n\nA cast in a fixture makes the test agree with itself rather than with the code. Use a type guard, a real constructor, or \`must()\`. \`!\` is fine here — a failing \`!\` is a failing test.`,
    ).toBeLessThanOrEqual(TestAssertionBudget);
});

test('Marked-sound assertions stay within budget', () => {
    const sound = findings.filter((finding) => finding.sound);
    expect(
        sound.length,
        `${describe(sound).join('\n')}\n\nEach of these is an assertion whose author argued it holds. If you removed one, lower SoundBudget; if you added one, a reviewer has to agree the invariant cannot be expressed in the type system.`,
    ).toBeLessThanOrEqual(SoundBudget);
});

test('Every `// sound:` marker covers an assertion it explains', () => {
    const explained = new Set(
        findings
            .filter((finding) => finding.sound)
            .map((finding) => finding.path),
    );
    const stale: string[] = [];
    for (const directory of Roots)
        for (const path of sourceFilesUnder(join(root, directory))) {
            const relativePath = relative(root, path);
            if (Skip.has(relativePath) || explained.has(relativePath)) continue;
            const text = readFileSync(path, 'utf-8');
            for (const [index, line] of text.split('\n').entries()) {
                const match = MarkerPattern.exec(line);
                if (match && (match[1] ?? '').trim().length >= 10)
                    stale.push(`${relativePath}:${index + 1}`);
            }
        }
    expect(
        stale.sort(),
        'These `// sound:` markers explain nothing: the assertion they covered is gone, the reason is too short to be one, or the marker sits too far from its statement. Remove the marker.',
    ).toEqual([]);
});
