import { test, expect, describe } from 'vitest';
import Source from '@nodes/Source';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import UnparsableExpression from '@nodes/UnparsableExpression';
import Templates from '@concepts/Templates';
import StructureDefinition from '@nodes/StructureDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Conditional from '@nodes/Conditional';
import Convert from '@nodes/Convert';
import Bind from '@nodes/Bind';
import Otherwise from '@nodes/Otherwise';
import Reaction from '@nodes/Reaction';
import Changed from '@nodes/Changed';
import Previous from '@nodes/Previous';
import Match from '@nodes/Match';
import type Expression from '@nodes/Expression';

function getRepairs(code: string): Expression[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const conflict = source.expression
        .getAllConflicts(context)
        .find((c): c is UnparsableConflict => c instanceof UnparsableConflict);
    if (conflict === undefined) {
        throw new Error(
            `Expected an UnparsableConflict for code "${code}" but found none — input parses cleanly.`,
        );
    }
    const resolutions = conflict.getResolutions(context, Templates);
    return resolutions
        .filter((r): r is Extract<typeof r, { kind: 'repair' }> =>
            r.kind === 'repair',
        )
        .map((r) => {
            const { newNode } = r.mediator(context, project.getLocales());
            if (newNode === undefined)
                throw new Error('Resolution mediator returned no newNode');
            return newNode as Expression;
        });
}

/**
 * Apply each suggestion's mediator and return the resulting project's source
 * text. Lets us assert what the *whole* code looks like after taking a
 * suggestion — necessary for parent-replacement tests where the swap covers
 * more than just the unparsable.
 */
function getRevisedSources(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const conflict = source.expression
        .getAllConflicts(context)
        .find((c): c is UnparsableConflict => c instanceof UnparsableConflict);
    if (conflict === undefined)
        throw new Error(`No UnparsableConflict for "${code}"`);
    const resolutions = conflict.getResolutions(context, Templates);
    return resolutions
        .filter((r): r is Extract<typeof r, { kind: 'repair' }> =>
            r.kind === 'repair',
        )
        .map(
            (r) =>
                r
                    .mediator(context, project.getLocales())
                    .newProject.getSources()[0]
                    ?.code.toString() ?? '',
        );
}

describe('UnparsableConflict.getResolutions — anchor symbols', () => {
    test('• suggests a StructureDefinition (issue #885 main case)', () => {
        expect(
            getRepairs('•').some((r) => r instanceof StructureDefinition),
        ).toBe(true);
    });

    test('? suggests a Conditional', () => {
        expect(getRepairs('?').some((r) => r instanceof Conditional)).toBe(
            true,
        );
    });

    test('x ? suggests a Conditional even when the unparsable is empty (parent anchor)', () => {
        expect(getRepairs('x ?').some((r) => r instanceof Conditional)).toBe(
            true,
        );
    });

    test(': suggests a Bind', () => {
        expect(getRepairs(':').some((r) => r instanceof Bind)).toBe(true);
    });

    test('?? suggests an Otherwise', () => {
        expect(getRepairs('??').some((r) => r instanceof Otherwise)).toBe(
            true,
        );
    });

    test('… suggests a Reaction', () => {
        expect(getRepairs('…').some((r) => r instanceof Reaction)).toBe(true);
    });

    test('∆ suggests a Changed (parent-anchor fallback)', () => {
        expect(getRepairs('∆').some((r) => r instanceof Changed)).toBe(true);
    });

    test('← suggests a Previous (parent-anchor fallback)', () => {
        expect(getRepairs('←').some((r) => r instanceof Previous)).toBe(true);
    });

    test('→ suggests a Convert when in an Expression slot', () => {
        // Plain `→` lands in a ConversionDefinition.input slot (which wants a
        // Type), so the Expression-shaped Convert gets filtered out. Putting
        // it after a literal puts it in an Expression slot where Convert fits.
        expect(
            getRepairs('5 → ø ?').some((r) => r instanceof Convert),
        ).toBe(true);
    });
});

describe('UnparsableConflict.getResolutions — adjacent-token absorption', () => {
    test('(ƒ ? — the ƒ in the parent surfaces a FunctionDefinition suggestion', () => {
        // The user typed `(ƒ ?` — `?` is the unparsable, `ƒ` is the partial parent.
        // The repair should propose FunctionDefinition (from the ƒ anchor on the parent)
        // alongside the Conditional candidate from the `?` itself.
        const repairs = getRepairs('(ƒ ?');
        expect(repairs.some((r) => r instanceof FunctionDefinition)).toBe(
            true,
        );
        expect(repairs.some((r) => r instanceof Conditional)).toBe(true);
    });
});

describe('UnparsableConflict.getResolutions — misconception substitution', () => {
    test('"fn" appearing as a name token in an unparsable surfaces a FunctionDefinition', () => {
        // `fn :)` makes the `)` unparsable but `fn` shows up in the adjacent
        // tokens, anchoring the FunctionDefinition skeleton via the `fn → ƒ`
        // misconception mapping.
        const repairs = getRepairs('fn :)');
        expect(repairs.some((r) => r instanceof FunctionDefinition)).toBe(
            true,
        );
    });
});

describe('UnparsableConflict — duplicate suppression', () => {
    function countUnparsableConflicts(code: string): number {
        const source = new Source('test', code);
        const project = Project.make(
            null,
            'test',
            source,
            [],
            DefaultLocale,
        );
        const context = project.getContext(source);
        return source.expression
            .getAllConflicts(context)
            .filter((c) => c instanceof UnparsableConflict).length;
    }

    test('`a ? ??` reports one conflict, not two (empty sibling defers to non-empty)', () => {
        expect(countUnparsableConflicts('a: ⊤\na ? ??')).toBe(1);
    });

    test('`←` reports one conflict, not two (both slots empty → first wins)', () => {
        expect(countUnparsableConflicts('←')).toBe(1);
    });

    test('genuinely separate broken statements in different parents still each report', () => {
        // Each `(...)` is its own Block, so the inner UnparsableExpressions
        // sit in distinct parents and neither defers to the other. (Plain
        // `??\n??` is parsed as a single Otherwise spanning both lines —
        // arguably one broken construct — so we don't test it as two.)
        expect(countUnparsableConflicts('(??)\n(??)')).toBe(2);
    });
});

describe('UnparsableConflict.getResolutions — guardrails', () => {
    test('repairs are capped at 3 per conflict', () => {
        expect(getRepairs('? ? ?').length).toBeLessThanOrEqual(3);
    });

    test('no repair is itself an UnparsableExpression (we never recommend the broken input)', () => {
        for (const code of ['?', ':', '•', '??', '…']) {
            for (const r of getRepairs(code)) {
                expect(r).not.toBeInstanceOf(UnparsableExpression);
            }
        }
    });

    test('completely garbage input either has no resolutions or only context-justified ones', () => {
        // We deliberately don't assert zero — the legacy template walker may
        // still find a hit. The guarantee we *can* make is that suggestions
        // are bounded.
        const source = new Source('test', '@@@');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const context = project.getContext(source);
        const conflict = source.expression
            .getAllConflicts(context)
            .find(
                (c): c is UnparsableConflict =>
                    c instanceof UnparsableConflict,
            );
        if (conflict !== undefined) {
            const resolutions = conflict.getResolutions(context, Templates);
            expect(resolutions.length).toBeLessThanOrEqual(3);
        }
    });
});

describe('UnparsableConflict.getResolutions — ranking', () => {
    test('a complete (non-scaffolded) repair, when one exists, ranks above any scaffolded one', () => {
        // `: fn` has multiple repairs; the Bind ones include both a "complete"
        // bind built from the tokens and various scaffolded variants. The
        // first repair should be a Bind (the complete one with the user's
        // tokens), not the scaffolded `_: _`.
        const repairs = getRepairs(': fn');
        expect(repairs.length).toBeGreaterThan(0);
        expect(repairs[0]).toBeInstanceOf(Bind);
    });
});

describe('UnparsableConflict.getResolutions — multi-glyph merge', () => {
    test('`5 ? ? ø` (intended ??) suggests `5??ø` as an Otherwise', () => {
        const repairs = getRepairs('5 ? ? ø');
        expect(repairs.some((r) => r instanceof Otherwise)).toBe(true);
    });

    test('`5 ? ? ø` swaps the whole malformed Conditional, not just the inner unparsable', () => {
        // The merge candidate's replaceTarget is the parent Conditional, so
        // the revised source should be exactly `5??ø` — no broken Conditional
        // shell left around an injected fragment.
        const sources = getRevisedSources('5 ? ? ø');
        expect(sources.some((s) => s.replace(/\s/g, '') === '5??ø')).toBe(true);
    });

    test('`x ? ? y` (intended ??) suggests an Otherwise', () => {
        const repairs = getRepairs('x ? ? y');
        expect(repairs.some((r) => r instanceof Otherwise)).toBe(true);
    });

    test('`5 ? ?? ø: 1 2` (intended ???) suggests a Match', () => {
        // The user typed `???` as `? ??` with an accidental space, in a
        // Match-shaped layout (case `ø → 1`, default `2`).
        const repairs = getRepairs('5 ? ?? ø: 1 2');
        expect(repairs.some((r) => r instanceof Match)).toBe(true);
    });

    test('`a ? ? ?` suggests Match even when a clean merge is unreachable', () => {
        // Merging `? ? ?` into `???` yields `a???`, which the parser treats as
        // an incomplete Match (no default case) — so a clean reparse isn't
        // possible. But the `? ? ?` pattern is a strong Match-intent signal on
        // its own, so a scaffolded Match suggestion should still appear.
        const repairs = getRepairs('a ? ? ?');
        expect(repairs.some((r) => r instanceof Match)).toBe(true);
    });

    test('`a ? ?` suggests Otherwise (and not Match)', () => {
        // Two spaced `?` tokens imply Otherwise; three would imply Match.
        const repairs = getRepairs('a ? ?');
        expect(repairs.some((r) => r instanceof Otherwise)).toBe(true);
        expect(repairs.every((r) => !(r instanceof Match))).toBe(true);
    });
});

describe('UnparsableConflict.getResolutions — parent-replacement', () => {
    test('a Previous repair for `←` replaces the whole malformed Previous, not just the empty inner unparsable', () => {
        // `←` parses as a Previous with empty .number and .stream slots, each
        // containing an empty UnparsableExpression. A skeleton Previous swap
        // at the inner level would leave the malformed outer Previous around;
        // the parent-class-match heuristic should hoist the swap to the
        // outer Previous so the revised source is exactly the skeleton.
        const sources = getRevisedSources('←');
        // The skeleton is `← _ _`, which serializes (without whitespace) to
        // `←__`. Confirm at least one revision matches that — i.e., the
        // suggestion replaced the WHOLE Previous, not just a sub-slot.
        const stripped = sources.map((s) => s.replace(/\s/g, ''));
        expect(stripped.some((s) => s === '←__')).toBe(true);
    });

    test('`(ƒ ?` — a FunctionDefinition repair replaces the parent FunctionDefinition, not just the inner `?`', () => {
        // The unparsable is `?`, sitting inside a partially-formed
        // FunctionDefinition. The FunctionDefinition skeleton should swap the
        // whole parent FunctionDefinition out, producing a clean function
        // definition rather than burying the skeleton inside the broken one.
        const sources = getRevisedSources('(ƒ ?');
        // The skeleton `ƒ _() _` ends up inside the outer Block ( ... ). One
        // of the revised sources should contain `ƒ_()_` — proving the
        // FunctionDefinition got swapped wholesale.
        expect(
            sources.some((s) => s.replace(/\s/g, '').includes('ƒ_()_')),
        ).toBe(true);
    });
});
