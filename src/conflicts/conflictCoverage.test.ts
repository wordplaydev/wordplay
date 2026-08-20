import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';

/**
 * Every conflict a node can raise needs a test that raises it *from that node*.
 *
 * Class-level coverage isn't enough, because a conflict is raised from as many
 * as twelve different node types and each has its own way of getting there:
 * `IncompatibleInput` from a `Delete` is not the same code path as
 * `IncompatibleInput` from a `BinaryEvaluate`. This derives the (conflict,
 * raising node) pairs from the source rather than from a list someone maintains,
 * so a new conflict — or a new place an old one is raised — arrives already
 * failing until it is covered.
 */

const src = path.join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (entry.name.endsWith('.ts')) out.push(p);
    }
    return out;
}

const all = walk(src);
const sources = all.filter((f) => !f.endsWith('.test.ts'));
const tests = all.filter((f) => f.endsWith('.test.ts'));

/** Every concrete conflict class. */
const conflicts = fs
    .readdirSync(path.join(src, 'conflicts'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => f.slice(0, -3))
    .filter((name) => {
        const text = fs.readFileSync(
            path.join(src, 'conflicts', `${name}.ts`),
            'utf8',
        );
        // Abstract bases are never raised on their own; their subclasses are.
        return (
            /extends Conflict\b/.test(text) &&
            !new RegExp(`abstract class ${name}\\b`).test(text)
        );
    });

/**
 * Pairs that are deliberately not covered from a given node, with the reason.
 * Prefer adding a test to adding a line here.
 */
const Exempt: Record<string, string> = {
    // `TableLiteral` raises this when a row cell is a `Bind`, but `parseRow`
    // only ever produces `Input | Expression` cells and `parseExpression`
    // reaches `parseBind` solely inside a block — so no program text can put a
    // Bind in a row. Reachable by building the tree by hand, which is not what
    // this is guarding.
    'UnexpectedColumnBind:TableLiteral':
        'unreachable through parsing; a row cell is never a Bind',
};

/** Files under src/nodes that declare a node class, by class name. */
const nodeClasses = new Set(
    sources
        .filter(
            (f) =>
                f.startsWith(path.join(src, 'nodes') + path.sep) &&
                new RegExp(
                    `export default (abstract )?class ${path.basename(f, '.ts')}\\b`,
                ).test(fs.readFileSync(f, 'utf8')),
        )
        .map((f) => path.basename(f, '.ts')),
);

/**
 * The node classes that construct this conflict.
 *
 * Only node classes: a conflict raised from a shared helper or a registered
 * analyzer (`analyzeMomentTimeZone`, `analyzePhraseEvaluate`) has one code path
 * however many nodes reach it, so one test covers it. It is the node classes
 * that each have their own way of getting there.
 */
function raisersOf(conflict: string): string[] {
    const constructed = new RegExp(`new ${conflict}\\s*\\(`);
    return sources
        .filter(
            (f) =>
                !f.endsWith(path.join('conflicts', `${conflict}.ts`)) &&
                constructed.test(fs.readFileSync(f, 'utf8')),
        )
        .map((f) => path.basename(f, '.ts'))
        .filter((name) => nodeClasses.has(name))
        .sort();
}

/** Test files that name this conflict, and the identifiers they name near it. */
const testedWith = new Map<string, Set<string>>();
for (const file of tests) {
    const text = fs.readFileSync(file, 'utf8');
    const named = conflicts.filter((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (named.length === 0) continue;
    for (const line of text.split('\n'))
        for (const conflict of named) {
            if (!new RegExp(`\\b${conflict}\\b`).test(line)) continue;
            const near = testedWith.get(conflict) ?? new Set<string>();
            // The node type a `testConflict` row names sits on the same row.
            for (const [, id] of line.matchAll(/\b([A-Z][A-Za-z]+)\b/g))
                near.add(id);
            // The file itself counts: `Delete.test.ts` naming IncompatibleInput
            // is a test of that conflict from that node.
            near.add(path.basename(file, '.test.ts'));
            testedWith.set(conflict, near);
        }
}

const pairs = conflicts.flatMap((conflict) =>
    raisersOf(conflict).map((raiser) => [conflict, raiser] as const),
);

test('every conflict class has at least one test', () => {
    const untested = conflicts.filter(
        (c) => (testedWith.get(c)?.size ?? 0) === 0,
    );
    expect(untested, 'conflicts no test names').toEqual([]);
});

test.each(pairs)('%s is tested where %s raises it', (conflict, raiser) => {
    if (Exempt[`${conflict}:${raiser}`] !== undefined) return;
    expect(
        testedWith.get(conflict)?.has(raiser) ?? false,
        `No test raises ${conflict} from ${raiser}. Add a case to src/nodes/${raiser}.test.ts, or exempt the pair with a reason.`,
    ).toBe(true);
});
