import { conflictsIn } from '@conflicts/TestUtilities';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Source from '@nodes/Source';
import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Analysis derives its layers in a fixed order — call graph, then dependency
 * graph, then conflicts — because each reads the ones before it. These are the
 * things that went wrong when it didn't. See #808.
 */

function project(code: string, name = 'main') {
    const source = new Source(name, code);
    return {
        source,
        project: Project.make(null, 'test', source, [], DefaultLocale),
    };
}

describe('analysis is idempotent', () => {
    test('a reaction over a function input has something to react to', () => {
        // The stream reaches the condition only through the call, so answering
        // this needs the call graph. Computing conflicts before building it
        // reported that the reaction had nothing to react to.
        expect(
            conflictsIn('ƒ blink(t•#ms) (1 … ∆ t … 2)\nblink(Time(1000ms))'),
        ).not.toContain('ExpectedStream');
    });

    test.each([
        ['ƒ blink(t•#ms) (1 … ∆ t … 2)\nblink(Time(1000ms))'],
        ['t: Time(1000ms)\n1 … ∆ t … 2'],
        ['ƒ f(x•#) x + 1\nf(2)'],
    ])('re-running the same traversal after analysis agrees: %s', (code) => {
        const { source, project: p } = project(code);
        const during = p
            .analyze()
            .conflicts.map((c) => c.constructor.name)
            .sort();
        // The identical walk, now that every layer exists. A conflict that
        // appears in one and not the other depended on how far along analysis
        // was when it was asked.
        const after = source.expression
            .getAllConflicts(p.getContext(source))
            .map((c) => c.constructor.name)
            .sort();
        expect(during).toEqual(after);
    });
});

describe('the call graph spans sources', () => {
    /** Where `f` is declared and where it is called, in both arrangements and
     * in one source, since source order used to decide the answer. */
    const arrangements: [string, Source, Source, Source[]][] = [];
    {
        const main = new Source('main', '↑ ƒ f(x•#) x + 1\n1');
        const sup = new Source('sup', '↓ main.f\nf(2)');
        arrangements.push([
            'declared in main, called in a supplement',
            main,
            main,
            [sup],
        ]);
    }
    {
        const sup = new Source('sup', '↑ ƒ f(x•#) x + 1\n1');
        const main = new Source('main', '↓ sup.f\nf(2)');
        arrangements.push([
            'declared in a supplement, called in main',
            sup,
            main,
            [sup],
        ]);
    }
    {
        const main = new Source('main', 'ƒ f(x•#) x + 1\nf(2)');
        arrangements.push([
            'declared and called in one source',
            main,
            main,
            [],
        ]);
    }

    test.each(arrangements)(
        'an input bind depends on the call, %s',
        (_, declaring, main, supplements) => {
            const p = Project.make(
                null,
                'test',
                main,
                supplements,
                DefaultLocale,
            );
            p.analyze();
            const fun = Array.from(declaring.nodes()).find(
                (n): n is FunctionDefinition => n instanceof FunctionDefinition,
            );
            expect(fun).toBeDefined();
            if (fun === undefined) return;
            const call = p.getEvaluationsOf(fun)[0];
            expect(call).toBeDefined();
            // A bind in a function has no value until someone calls it, so the
            // call is one of its dependencies. Without this edge a reaction
            // inside the function stops reevaluating.
            expect(p.getExpressionsAffectedBy(call).has(fun.inputs[0])).toBe(
                true,
            );
        },
    );

    test('a source added later gets its calls into a carried source recorded', () => {
        // The carried source keeps its own analysis, but the calls the new
        // source makes into it are new, so its dependency edges are not.
        const lib = new Source('lib', '↑ ƒ f(x•#) x + 1\n1');
        const before = Project.make(
            null,
            'test',
            new Source('main', '1'),
            [lib],
            DefaultLocale,
        );
        before.analyze();

        const after = before.withSource(
            before.getMain(),
            new Source('main', '↓ lib.f\nf(2)'),
        );
        after.analyze();

        const fun = Array.from(lib.nodes()).find(
            (n): n is FunctionDefinition => n instanceof FunctionDefinition,
        );
        expect(fun).toBeDefined();
        if (fun === undefined) return;
        const call = after.getEvaluationsOf(fun)[0];
        expect(call).toBeDefined();
        expect(after.getExpressionsAffectedBy(call).has(fun.inputs[0])).toBe(
            true,
        );
    });
});

describe('conflicts are reported where they happen', () => {
    test('one mistake repeated is reported every time it is made', () => {
        // Deduplicating conflicts structurally collapsed these into one,
        // because references to the same unknown name are identical nodes.
        const lines = 6;
        const code =
            Array.from({ length: lines }, (_, i) => `v${i}: nope`).join('\n') +
            '\nv0';
        const { source, project: p } = project(code);
        const analysis = p.analyze();
        const unknown = analysis.conflicts.filter(
            (c) => c.constructor.name === 'UnknownName',
        );
        expect(unknown).toHaveLength(lines);
        // And each is attributed to a different node, so each gets its own
        // underline rather than sharing one.
        expect(analysis.conflictedNodes.size).toBeGreaterThanOrEqual(lines);
        expect(
            source.expression.getAllConflicts(p.getContext(source)).length,
        ).toBeGreaterThanOrEqual(lines);
    });

    test('a genuine duplicate is still only reported once', () => {
        const { source, project: p } = project('nope');
        const raw = source.expression.getAllConflicts(p.getContext(source));
        const analyzed = p.analyze().conflicts;
        expect(analyzed.length).toBeLessThanOrEqual(raw.length);
        expect(new Set(analyzed).size).toBe(analyzed.length);
    });
});

describe('the shipped examples', () => {
    const dir = path.join(process.cwd(), 'static', 'examples');
    const names = fs.readdirSync(dir).filter((f) => f.endsWith('.wp'));

    /**
     * Enough for `Lyrics.wp`, which is a 198KB machine-generated outlier: it
     * spends about 3s here on a dev machine, most of it parsing, and CI runs
     * roughly three times slower — 8.2s when it first tripped the 5s default.
     * The rest of the examples finish in under 300ms.
     */
    const SlowestExample = 30_000;

    test.each(names)(
        '%s reports the same conflicts during and after analysis',
        (name) => {
            const code = fs.readFileSync(path.join(dir, name), 'utf8');
            const { source, project: p } = project(code, name);
            const during = p
                .analyze()
                .conflicts.map((c) => c.constructor.name)
                .sort();
            const after = source.expression
                .getAllConflicts(p.getContext(source))
                .map((c) => c.constructor.name)
                .sort();
            expect(during).toEqual(after);
        },
        SlowestExample,
    );
});

describe('an analysis nobody ran is not an analysis', () => {
    test('reading conflicts before analyzing says so', () => {
        const { project: p } = project('nope');
        // Not `[]`. Answering "no conflicts" for "no analysis" is how an
        // un-analyzed project reported a clean bill of health.
        expect(p.getAnalysis()).toBeUndefined();
        expect(p.getConflicts()).toBeUndefined();
        expect(p.getConflictedNodes()).toBeUndefined();
        expect(p.analyze().conflicts.length).toBeGreaterThan(0);
        expect(p.getConflicts()).toBeDefined();
    });
});
