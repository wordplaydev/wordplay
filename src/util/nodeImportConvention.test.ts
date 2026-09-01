/**
 * Wordplay's AST base class `Node` shares its name with the DOM `Node`
 * interface, so a file that forgets `import Node from '@nodes/Node'` silently
 * type-checks against the DOM type and produces baffling errors like
 * "Type 'Node' is not assignable to type 'Node'" (#816). This convention test
 * fails any source file that references `Node` without binding it locally,
 * except the explicitly exempt files that genuinely mean the DOM `Node`.
 *
 * Known limitation: Svelte markup outside `<script>` blocks isn't parsed, so a
 * markup-only bare `Node` would slip through; no current file does that.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type Node from '@nodes/Node';
import ts from 'typescript';
import { expect, test } from 'vitest';

/** The only files that mean the DOM `Node`; they must not bind a `Node` of their own, or the DOM meaning would no longer hold. */
const Exempt = new Set([
    // TreeWalker traversal of a fetched document: `Node | null` and Node.TEXT_NODE.
    'src/input/Webpage/Webpage.ts',
    // Outside-click detection: `e.target as Node` for Element.contains().
    'src/components/widgets/OverflowToolbar.svelte',
    // Also the DOM one: the reaction picker closes on a press outside itself,
    // which means asking `e.target instanceof Node` before Element.contains().
    'src/components/app/chat/ReactionPicker.svelte',
]);

function sourceFilesUnder(directory: string): string[] {
    const files: string[] = [];
    for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) files.push(...sourceFilesUnder(path));
        else if (name.endsWith('.ts') || name.endsWith('.svelte'))
            files.push(path);
    }
    return files;
}

/** Whether this identifier is the name being introduced by a declaration, rather than a reference to an existing one. */
function isDeclarationName(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    return (
        (ts.isClassDeclaration(parent) ||
            ts.isInterfaceDeclaration(parent) ||
            ts.isTypeAliasDeclaration(parent) ||
            ts.isEnumDeclaration(parent) ||
            ts.isFunctionDeclaration(parent) ||
            ts.isVariableDeclaration(parent) ||
            ts.isBindingElement(parent) ||
            ts.isParameter(parent) ||
            ts.isTypeParameterDeclaration(parent)) &&
        parent.name === identifier
    );
}

/** Whether this identifier is a property name or specifier, not a use of a value or type named `Node`. */
function isPropertyOrSpecifierName(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    return (
        ((ts.isPropertyAccessExpression(parent) ||
            ts.isPropertyAssignment(parent) ||
            ts.isPropertySignature(parent) ||
            ts.isPropertyDeclaration(parent) ||
            ts.isMethodDeclaration(parent) ||
            ts.isMethodSignature(parent) ||
            ts.isEnumMember(parent) ||
            ts.isGetAccessorDeclaration(parent) ||
            ts.isSetAccessorDeclaration(parent)) &&
            parent.name === identifier) ||
        (ts.isQualifiedName(parent) && parent.right === identifier) ||
        ts.isImportSpecifier(parent) ||
        ts.isExportSpecifier(parent)
    );
}

/** Classify whether the code binds a local `Node` and whether it references one. */
function classify(code: string): { bound: boolean; referenced: boolean } {
    const source = ts.createSourceFile(
        'file.ts',
        code,
        ts.ScriptTarget.Latest,
        // Set parents so identifiers can be classified by context.
        true,
    );
    let bound = false;
    let referenced = false;
    function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node)) {
            const clause = node.importClause;
            if (clause) {
                if (clause.name?.text === 'Node') bound = true;
                const bindings = clause.namedBindings;
                if (bindings) {
                    if (ts.isNamespaceImport(bindings)) {
                        if (bindings.name.text === 'Node') bound = true;
                    } else if (
                        bindings.elements.some(
                            (element) => element.name.text === 'Node',
                        )
                    )
                        bound = true;
                }
            }
            // Import identifiers are bindings, never references.
            return;
        }
        if (ts.isIdentifier(node) && node.text === 'Node') {
            if (isDeclarationName(node)) bound = true;
            else if (!isPropertyOrSpecifierName(node)) referenced = true;
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    return { bound, referenced };
}

/** Extract the TypeScript in a file: whole file for .ts, concatenated script blocks for .svelte. */
function codeIn(path: string): string {
    const text = readFileSync(path, 'utf-8');
    if (!path.endsWith('.svelte')) return text;
    return Array.from(text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
        .map((match) => match[1])
        .join('\n');
}

const root = resolve(__dirname, '../..');

function scan(): Map<string, { bound: boolean; referenced: boolean }> {
    const results = new Map<string, { bound: boolean; referenced: boolean }>();
    for (const path of sourceFilesUnder(join(root, 'src'))) {
        const code = codeIn(path);
        // Cheap pre-filter: only parse files that mention the word at all.
        if (!/\bNode\b/.test(code)) continue;
        results.set(relative(root, path), classify(code));
    }
    return results;
}

const classifications = scan();

test('Every use of `Node` binds it, so it cannot silently mean the DOM Node', () => {
    const offenders = Array.from(classifications)
        .filter(
            ([path, { bound, referenced }]) =>
                referenced && !bound && !Exempt.has(path),
        )
        .map(([path]) => path)
        .sort();
    expect(
        offenders,
        "These files use `Node` without binding it, so TypeScript resolves it to the DOM's Node interface and produces confusing type errors (#816). Add `import Node from '@nodes/Node';` (or `import type Node from '@nodes/Node';`) — or, if the file genuinely means the DOM Node, add it to this test's exemption list with a comment saying why.",
    ).toEqual([]);
});

test('Exempt files still use the DOM `Node` without binding a Wordplay one', () => {
    const stale = Array.from(Exempt)
        .filter((path) => {
            const classification = classifications.get(path);
            return (
                classification === undefined ||
                !classification.referenced ||
                classification.bound
            );
        })
        .sort();
    expect(
        stale,
        'These exemptions are stale: the file no longer exists, no longer references a bare `Node`, or now binds its own `Node`. Remove it from the exemption list.',
    ).toEqual([]);
});

test('Wordplay Node declares the DOM-collision signpost', () => {
    // If Node.ts's phantom member is removed, this assignment fails `npm run check:now`; vitest strips types, so the runtime assertion is a formality.
    const hint: keyof Node =
        "🛑 This is a Wordplay AST node — a bare `Node` type is the DOM's; import Node from '@nodes/Node'";
    expect(hint.length).toBeGreaterThan(0);
});
