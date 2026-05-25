import { test, expect, describe } from 'vitest';
import Source from '@nodes/Source';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import IncompatibleType from '@conflicts/IncompatibleType';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import MissingInput from '@conflicts/MissingInput';
import type { Resolution } from '@conflicts/Conflict';
import Templates from '@concepts/Templates';
import type Conflict from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import ListLiteral from '@nodes/ListLiteral';
import Convert from '@nodes/Convert';
import Otherwise from '@nodes/Otherwise';
import Conditional from '@nodes/Conditional';
import Bind from '@nodes/Bind';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import DefaultLocales from '@locale/DefaultLocales';

const TYPE_MISMATCH = (c: Conflict) =>
    c instanceof IncompatibleType ||
    c instanceof IncompatibleInput ||
    c instanceof IncompatibleKey ||
    c instanceof IncompatibleCellType ||
    c instanceof ExpectedBooleanCondition ||
    c instanceof MissingInput;

function getConflictAndRepairs(
    code: string,
    predicate: (c: Conflict) => boolean = TYPE_MISMATCH,
): {
    project: Project;
    conflict: Conflict | undefined;
    repairs: {
        node: Node | undefined;
        resolution: Extract<Resolution, { kind: 'repair' }>;
    }[];
} {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const context = project.getContext(source);
    const conflict = project.getAnalysis().conflicts.find(predicate);
    if (conflict === undefined)
        return { project, conflict: undefined, repairs: [] };
    const resolutions = conflict.getResolutions(context, Templates);
    type RepairResolution = Extract<
        (typeof resolutions)[number],
        { kind: 'repair' }
    >;
    const repairResolutions = resolutions.filter(
        (r): r is RepairResolution => r.kind === 'repair',
    );
    const repairs = repairResolutions.map((r) => {
        const { newNode } = r.mediator(context, project.getLocales());
        return { node: newNode, resolution: r };
    });
    return { project, conflict, repairs };
}

describe('TypeResolutions — Convert (regression)', () => {
    test('Bind expecting text with a Number value still suggests a Convert', () => {
        const { repairs } = getConflictAndRepairs(`a•'': 5`);
        expect(repairs.some((r) => r.node instanceof Convert)).toBe(true);
    });
});

describe('TypeResolutions — literal annotation (#1025)', () => {
    test('list of literal text accessed by index suggests `!` on the list', () => {
        const { repairs, project } = getConflictAndRepairs(
            `Phrase('hi' face: ['Aclonica' 'Arvo'][1])`,
        );
        const literalRepair = repairs.find(
            (r) =>
                r.node instanceof ListLiteral && r.node.literal !== undefined,
        );
        expect(literalRepair).toBeDefined();
        if (literalRepair) {
            const ctx = project.getContext(project.getMain());
            const newProject = literalRepair.resolution.mediator(
                ctx,
                project.getLocales(),
            ).newProject;
            newProject.analyze();
            const remaining = newProject
                .getAnalysis()
                .conflicts.filter(TYPE_MISMATCH);
            expect(remaining).toHaveLength(0);
        }
    });
});

describe('TypeResolutions — none coalescing', () => {
    test('text-or-none bound to text suggests `??`', () => {
        const { repairs } = getConflictAndRepairs(
            `b•''|ø: 'hi'\nc•'': b`,
        );
        expect(repairs.some((r) => r.node instanceof Otherwise)).toBe(true);
    });
});

describe('TypeResolutions — type guard', () => {
    test('union reference assigned to one member suggests a guard Conditional', () => {
        const { repairs } = getConflictAndRepairs(
            `x•''|#: 'hi'\ny•'': x`,
        );
        expect(repairs.some((r) => r.node instanceof Conditional)).toBe(true);
    });
});

describe('TypeResolutions — placeholder fallback', () => {
    test('a truly incompatible binding falls back to an ExpressionPlaceholder repair', () => {
        // 'mouse' isn't in 'cat'|'dog'; no conversion, no widen path; we
        // should at least be offered the placeholder fallback.
        const { repairs } = getConflictAndRepairs(`a•'cat'|'dog': 'mouse'`);
        expect(
            repairs.some((r) => r.node instanceof ExpressionPlaceholder),
        ).toBe(true);
    });
});

describe('TypeResolutions — reorder evaluate arguments', () => {
    test('two type-swapped arguments to a 2-input function suggests a reorder', () => {
        const { repairs } = getConflictAndRepairs(
            `ƒ swap(x•# y•'') x\nswap('hi' 5)`,
        );
        expect(repairs.some((r) => r.node instanceof Evaluate)).toBe(true);
    });
});

describe('TypeResolutions — add missing input', () => {
    test('a function call missing a required input suggests adding it', () => {
        const { project } = getConflictAndRepairs(
            `ƒ greet(name•'') name\ngreet()`,
            (c) => c instanceof MissingInput,
        );
        // MissingInput's resolver returns at least two resolutions (add-default
        // and add-placeholder). Both produce an Evaluate as the replacement.
        const ctx = project.getContext(project.getMain());
        const conflict = project
            .getAnalysis()
            .conflicts.find((c): c is MissingInput => c instanceof MissingInput);
        expect(conflict).toBeDefined();
        if (conflict) {
            const resolutions = conflict.getResolutions(ctx, Templates);
            expect(resolutions.length).toBeGreaterThanOrEqual(1);
            const first = resolutions[0];
            expect(first.kind).toBe('repair');
            if (first.kind === 'repair') {
                const { newNode } = first.mediator(
                    ctx,
                    project.getLocales(),
                );
                expect(newNode).toBeInstanceOf(Evaluate);
            }
        }
    });
});

describe('TypeResolutions — type declaration', () => {
    test('Bind whose list value generalizes too far suggests an explicit type', () => {
        // Bind has no declared type; its value is a list of two literal text
        // values. The dependency walk reaches the Bind via `faces` Reference,
        // and the Declaration generator should offer an annotated bind.
        const { repairs } = getConflictAndRepairs(
            `faces: ['Aclonica' 'Arvo']\nPhrase('hi' face: faces[1])`,
        );
        expect(
            repairs.some(
                (r) => r.node instanceof Bind && r.node.type !== undefined,
            ),
        ).toBe(true);
    });
});

describe('TypeResolutions — guardrails', () => {
    test('resolutions are capped at 4', () => {
        const { repairs } = getConflictAndRepairs(`b•''|ø: 'hi'\nc•'': b`);
        expect(repairs.length).toBeLessThanOrEqual(4);
    });
});

describe('TypeResolutions — phrasing', () => {
    test('descriptions name the expected type and include a reason phrase', () => {
        const { repairs, project } = getConflictAndRepairs(
            `b•''|ø: 'hi'\nc•'': b`,
        );
        expect(repairs.length).toBeGreaterThan(0);
        const ctx = project.getContext(project.getMain());
        for (const r of repairs) {
            const text = r.resolution
                .description(DefaultLocales, ctx)
                .toText()
                .toLowerCase();
            expect(text).toMatch(/since|needs|required|allow|missing/);
        }
    });
});
