import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import Token from '@nodes/Token';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';
import {
    dropNodeOnSource,
    getBlockingDropConflicts,
    getDropConflicts,
    InsertionPoint,
    isDropPermitted,
    isValidDropTarget,
} from '@edit/drag/Drag';

test.each([
    // Replace placeholder with rootless expression
    [
        ['1 + _'],
        () => parseExpression(toTokens('1')),
        (sources: Source[]) =>
            sources[0].nodes(
                (node): node is ExpressionPlaceholder =>
                    node instanceof ExpressionPlaceholder,
            )[0],
        '1 + 1',
    ],
    // Replace placeholder with expression from same source
    [
        ['1 + _\n2'],
        (sources: Source[]) => sources[0].find(NumberLiteral, 1),
        (sources: Source[]) => sources[0].find(ExpressionPlaceholder),
        '1 + 2\n',
    ],
    // Replace placeholder with expression from other source
    [
        ['1 + _', '2'],
        (sources: Source[]) => sources[1].find<Node>(NumberLiteral),
        (sources: Source[]) =>
            sources[0].nodes(
                (node): node is ExpressionPlaceholder =>
                    node instanceof ExpressionPlaceholder,
            )[0],
        '1 + 2',
        '',
    ],
    // Insertion rootless expression in source
    [
        ['[1 3 4 5]'],
        () => parseExpression(toTokens('2')),
        (sources: Source[]) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]',
    ],
    // Insertion expression from source in expression
    [
        ['[1 3 4 5]\n2'],
        (sources) => sources[0].find(NumberLiteral, 4),
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]\n',
    ],
    // Insert expression from other source in expression
    [
        ['[1 3 4 5]', '2'],
        (sources) => sources[1].find(NumberLiteral),
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]',
        '',
    ],
    // Drop reaction with placeholders onto a typed bind. The dragged node is rootless (a palette
    // drop), so placeholders with a known type are filled with their default: the explicitly
    // boolean-typed condition `_•?` becomes `⊤`. The value placeholders' type can't be inferred
    // through Reaction, so they have no default and are left for the creator.
    [
        ['a•#: _'],
        () => parseExpression(toTokens('_ … _•? … _')),
        (sources) => sources[0].find(ExpressionPlaceholder),
        'a•#: _ … ⊤ … _',
    ],
    // Drop list onto typed list
    [
        ['a•[#]: _'],
        () => parseExpression(toTokens('[]')),
        (sources) => sources[0].find(ExpressionPlaceholder),
        'a•[#]: []',
    ],
    // Insert number into unit-typed number list, despite type error.
    [
        ['Place()'],
        () => parseExpression(toTokens('1')),
        (sources) => {
            const node = sources[0].find<Evaluate>(Evaluate);
            return new InsertionPoint(
                node,
                'inputs',
                node.inputs,
                node.find<Token>(Token, 2),
                0,
                0,
            );
        },
        'Place(1)',
    ],
])(
    'Drop on %s should yield %s',
    (
        source: string[],
        dragged: (sources: Source[]) => Node,
        target: (sources: Source[]) => Node | InsertionPoint,
        mainExpected: string,
        supplementExpected?: string,
    ) => {
        const sources = source.map((s) => new Source('test', s));
        const project = Project.make(
            null,
            'test',
            sources[0],
            sources.slice(1),
            DefaultLocale,
        );

        const draggedNode: Node = dragged(sources);
        const targetNode: Node | InsertionPoint = target(sources);

        // Node targets must be structurally valid drop targets. (Insertion points carry their own
        // structural validity from detection, so isValidDropTarget doesn't apply to them.)
        if (!(targetNode instanceof InsertionPoint))
            expect(isValidDropTarget(project, draggedNode, targetNode)).toBe(
                true,
            );

        const [newProject] = dropNodeOnSource(
            project,
            sources[0],
            draggedNode,
            targetNode,
        ) ?? [undefined, undefined];

        // Assert that the new project matches expectations.
        expect(newProject).toBeDefined();
        expect(newProject?.getMain().toWordplay()).toBe(mainExpected);
        if (supplementExpected)
            expect(newProject?.getSupplements()[0].toWordplay()).toBe(
                supplementExpected,
            );
    },
);

test('getDropConflicts returns [] for a clean placeholder replacement', () => {
    const source = new Source('test', '1 + _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('1'));
    const target = source.find(ExpressionPlaceholder);
    expect(
        getDropConflicts(project, source, dragged, target).conflicts,
    ).toHaveLength(0);
});

test('getDropConflicts returns [] when a drop only leaves a placeholder behind (cross-source)', () => {
    const main = new Source('test', '1 + _');
    const supplement = new Source('other', '2');
    const project = Project.make(
        null,
        'test',
        main,
        [supplement],
        DefaultLocale,
    );
    // Drag the 2 from the other source onto the placeholder; the donor source is left with a
    // placeholder (a minor conflict), which must not count as a new conflict.
    const dragged = supplement.find<Node>(NumberLiteral);
    const target = main.find(ExpressionPlaceholder);
    expect(
        getDropConflicts(project, main, dragged, target).conflicts,
    ).toHaveLength(0);
});

test('getDropConflicts reports the conflict a type-erroring drop would introduce', () => {
    const source = new Source('test', 'Place()');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('1'));
    const node = source.find<Evaluate>(Evaluate);
    const target = new InsertionPoint(
        node,
        'inputs',
        node.inputs,
        node.find<Token>(Token, 2),
        0,
        0,
    );
    // The drop is permitted (Place(1) is produced) but introduces a major conflict we can explain.
    expect(
        getDropConflicts(project, source, dragged, target).conflicts.length,
    ).toBeGreaterThan(0);
});

test('a drop that creates an unknown name is blocked (Error severity)', () => {
    const source = new Source('test', '1 + _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    // Dragging a reference to an undefined name onto the placeholder → `1 + saddf` → unknown name.
    const dragged = parseExpression(toTokens('saddf'));
    const target = source.find(ExpressionPlaceholder);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('UnknownName');
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
});

test('a type-mismatch drop is blocked (Error severity)', () => {
    const source = new Source('test', 'a•#: _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    // Dropping text into a number-typed bind is a type mismatch — a blocking error.
    const dragged = parseExpression(toTokens('"hi"'));
    const target = source.find(ExpressionPlaceholder);
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('IncompatibleType');
});

test('a palette drop fills typed placeholders with their defaults', () => {
    // A rootless dragged node = a Wellspring/Guide (palette) drop.
    const source = new Source('test', '_');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('Phrase(_)'));
    const target = source.find(ExpressionPlaceholder);
    const [newProject] = dropNodeOnSource(project, source, dragged, target);
    // Phrase's text input default is an empty text literal, so no placeholder remains.
    expect(
        newProject
            .getMain()
            .nodes(
                (n): n is ExpressionPlaceholder =>
                    n instanceof ExpressionPlaceholder,
            ),
    ).toHaveLength(0);
});

test('a palette drop resolves an ambiguous slot to the first autocomplete pick', () => {
    // Group's layout slot is an abstract Arrangement; getDefaultExpression deterministically picks
    // the first concrete arrangement in basis order (Stack), matching the autocomplete top pick.
    const source = new Source('test', '_');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('Group(_ _)'));
    const target = source.find(ExpressionPlaceholder);
    const [newProject] = dropNodeOnSource(project, source, dragged, target);
    // ⬇ is Stack (the first concrete arrangement in basis order); content is an empty list.
    expect(newProject.getMain().toWordplay()).toBe('Group(⬇() [])');
    expect(
        newProject
            .getMain()
            .nodes(
                (n): n is ExpressionPlaceholder =>
                    n instanceof ExpressionPlaceholder,
            ),
    ).toHaveLength(0);
});

test('an editor-internal move does not fill placeholders', () => {
    // The dragged Phrase is rooted in a source (not a palette drop), so its inner placeholder is
    // preserved when moved, rather than filled.
    const main = new Source('test', '_');
    const supplement = new Source('other', 'Phrase(_)');
    const project = Project.make(
        null,
        'test',
        main,
        [supplement],
        DefaultLocale,
    );
    const dragged = supplement.find<Evaluate>(Evaluate);
    const target = main.find(ExpressionPlaceholder);
    const [newProject] = dropNodeOnSource(project, main, dragged, target);
    expect(newProject.getMain().toWordplay()).toBe('Phrase(_)');
});

test('a palette drop leaves placeholders with no default alone', () => {
    // A bare placeholder dropped at the program root has an un-inferable AnyType, which has no
    // default, so it is left for the creator to fill.
    const source = new Source('test', '_');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('_'));
    const target = source.find(ExpressionPlaceholder);
    const [newProject] = dropNodeOnSource(project, source, dragged, target);
    expect(newProject.getMain().toWordplay()).toBe('_');
});

test.each([
    // [type annotation, whether the default should also strictly type-check]
    // Empty map/structure defaults are intentionally loosely typed (e.g. `{:}` is `{_:_}`, which a
    // concrete `{#:#}` doesn't strictly accept), so we only require that a default *exists* there.
    ['_•#', true],
    ["_•''", true],
    ['_•?', true],
    ['_•ø', true],
    ['_•[#]', true],
    ['_•{#}', true],
    ['_•{#:#}', false],
    ['_•#|#m', true],
    ['_•Phrase', false],
    ['_•Group', false],
])(
    'a %s placeholder has a default expression that is reasonably typed',
    (code: string, strict: boolean) => {
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const context = project.getContext(source);
        const placeholder = source.find<ExpressionPlaceholder>(
            ExpressionPlaceholder,
        );
        const type = placeholder.computeType(context);
        const def = ExpressionPlaceholder.getDefaultExpressions(
            placeholder,
            context,
            project.getLocales(),
        )[0];
        // A default must exist (this guards the structure-type resolution that lets named slots
        // like a Group's layout fill on drop).
        expect(def).toBeDefined();
        if (strict)
            expect(type.accepts(def.getType(context), context)).toBe(true);
    },
);

test('dropping a structure into a wrong-typed function input is blocked', () => {
    // The reported defect: Group is not valid for Phrase's text input, so `'a'` must not be a drop target.
    const source = new Source('test', "Phrase('a')");
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('Group(_ _)'));
    const target = source.find(TextLiteral);
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('IncompatibleInput');
});
