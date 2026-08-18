/**
 * A static import-graph walker, used by importGraph.test.ts to keep the
 * language runtime out of pages that don't need it.
 *
 * The app's route graph is the thing that decides what every page downloads:
 * one stray value import of `Color` or `Commands` in shared chrome pulls the
 * basis, the evaluator, and the output layer into every route's bundle. This
 * resolves imports the way the bundler does — aliases from svelte.config.js,
 * `import type` erased — so a test can assert what a route can reach and print
 * the chain when the answer is wrong.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

/** Alias prefixes mirroring svelte.config.js. */
const Aliases: [string, string][] = [
    ['@components', 'src/components'],
    ['@nodes', 'src/nodes'],
    ['@runtime', 'src/runtime'],
    ['@values', 'src/values'],
    ['@conflicts', 'src/conflicts'],
    ['@locale', 'src/locale'],
    ['@parser', 'src/parser'],
    ['@input', 'src/input'],
    ['@output', 'src/output'],
    ['@basis', 'src/basis'],
    ['@edit', 'src/edit'],
    ['@db', 'src/db'],
    ['@unicode', 'src/unicode'],
    ['@concepts', 'src/concepts'],
    ['@util', 'src/util'],
];

/** Extensions tried when a specifier has none, in resolution order. */
const Extensions = ['', '.ts', '.svelte', '.svelte.ts', '/index.ts'];

/**
 * Every `import`/`export … from` specifier in a source file, with `import type`
 * and `export type` dropped — those are erased at build time and cost nothing.
 * Dynamic `import()` is also dropped: it produces a separate chunk, which is
 * exactly the deferral this guard is protecting.
 */
export function staticImportsOf(source: string): string[] {
    // Strip line and block comments so commented-out imports don't count.
    const code = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const specifiers: string[] = [];
    const pattern =
        /(?:^|[\s;}])(import|export)\s+([\s\S]*?)?from\s*['"]([^'"]+)['"]|(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
        const clause = match[2] ?? '';
        const specifier = match[3] ?? match[4];
        if (specifier === undefined) continue;
        // `import type X` / `import { type X }`-only clauses are erased. A
        // clause mixing type and value imports still carries a value edge.
        if (/^\s*type\s/.test(clause)) continue;
        if (clause.includes('{')) {
            const named = clause.slice(
                clause.indexOf('{') + 1,
                clause.lastIndexOf('}'),
            );
            const before = clause.slice(0, clause.indexOf('{')).trim();
            const items = named
                .split(',')
                .map((i) => i.trim())
                .filter((i) => i.length > 0);
            const allTypes =
                items.length > 0 && items.every((i) => /^type\s/.test(i));
            // A default import beside the braces is still a value edge.
            if (allTypes && before.replace(/,$/, '').trim() === '') continue;
        }
        specifiers.push(specifier);
    }
    return specifiers;
}

/** Resolve a specifier to a repo-relative path, or undefined if it's external
 * (a node_module, a Svelte/SvelteKit builtin, or a non-code asset). */
export function resolveSpecifier(
    fromFile: string,
    specifier: string,
    root: string,
): string | undefined {
    let base: string | undefined;
    if (specifier.startsWith('.'))
        base = resolve(root, dirname(fromFile), specifier);
    else {
        const alias = Aliases.find(
            ([prefix]) =>
                specifier === prefix || specifier.startsWith(prefix + '/'),
        );
        if (alias === undefined) return undefined;
        base = resolve(root, alias[1] + specifier.slice(alias[0].length));
    }
    for (const extension of Extensions) {
        const candidate = base + extension;
        if (existsSync(candidate) && statSync(candidate).isFile())
            return relative(root, candidate);
    }
    return undefined;
}

export type Reach = {
    /** Every repo-relative file statically reachable from the entry. */
    files: Set<string>;
    /** Total source bytes, a proxy for what the route's chunks must carry. */
    bytes: number;
    /** The shortest import chain from the entry to a file, for diagnostics. */
    chainTo: (target: string) => string[] | undefined;
};

/** Parsed imports and size per file, shared across walks: the entries overlap
 * almost entirely, and re-reading ~900 files per entry is enough I/O to slow
 * the whole test run. */
const parsed = new Map<
    string,
    { imports: string[]; bytes: number } | undefined
>();

function parseFile(file: string, root: string) {
    const cached = parsed.get(file);
    if (cached !== undefined || parsed.has(file)) return cached;
    let entry: { imports: string[]; bytes: number } | undefined;
    try {
        const source = readFileSync(resolve(root, file), 'utf8');
        entry = { imports: staticImportsOf(source), bytes: source.length };
    } catch {
        entry = undefined;
    }
    parsed.set(file, entry);
    return entry;
}

export type ReachOptions = {
    /**
     * Edges to pretend aren't there. The doors the runtime comes through are
     * being closed one at a time, and each one hides the others: while the
     * database still reaches Project, every component that reads a store from
     * it measures as heavy. Cutting an edge here answers "what would this
     * reach once that stage lands", which is what makes the stages plannable
     * separately.
     */
    skip?: (from: string, to: string) => boolean;
};

/** Walk every static import edge reachable from `entry`. */
export function reachFrom(
    entry: string,
    root: string,
    options: ReachOptions = {},
): Reach {
    const files = new Set<string>([entry]);
    const parent = new Map<string, string>();
    const queue = [entry];
    let bytes = 0;
    while (queue.length > 0) {
        const file = queue.shift();
        if (file === undefined) continue;
        const contents = parseFile(file, root);
        if (contents === undefined) continue;
        bytes += contents.bytes;
        for (const specifier of contents.imports) {
            const next = resolveSpecifier(file, specifier, root);
            if (next === undefined || files.has(next)) continue;
            if (options.skip?.(file, next) === true) continue;
            files.add(next);
            parent.set(next, file);
            queue.push(next);
        }
    }
    return {
        files,
        bytes,
        chainTo(target: string) {
            if (!files.has(target)) return undefined;
            const chain = [target];
            let at = target;
            while (at !== entry) {
                const from = parent.get(at);
                if (from === undefined) break;
                chain.unshift(from);
                at = from;
            }
            return chain;
        },
    };
}
