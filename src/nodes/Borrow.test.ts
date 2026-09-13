import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Choice from '@input/Choice/Choice';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import evaluateCode from '@runtime/evaluate';
import ExceptionValue from '@values/ExceptionValue';
import { describe, expect, test } from 'vitest';
import { dependencyKey, type Dependency } from '@nodes/Borrow';
import DefaultLocales from '@locale/DefaultLocales';
import Token from '@nodes/Token';
import getPreferredSpaces from '@parser/getPreferredSpaces';

test.each([
    [
        `
Time()
`,
        [],
        '0ms',
    ],
    [
        `
        ↓ sup1
        sup1
    `,
        [`0`],
        '0',
    ],
    [
        `↓ sup1.a
        a
        `,
        [`↑ a: 0`],
        '0',
    ],
])('Expect %s to be %s', (code, supplements, value) => {
    expect(evaluateCode(code, supplements)?.toString()).toBe(value);
});

// Regression: a Borrow was eligible for the reuse-prior-value fast path, but its
// value comes from an inner Evaluation its Start launches and its purpose is the
// side effect of binding the borrowed names. Skipping it left the names unbound
// and its Finish popping an empty stack, so any stream change in a project with a
// borrowed source (e.g. the CodeGap example's data tables) threw a ValueException.
test('a borrowed source survives a stream reevaluation', () => {
    const main = new Source(
        'main',
        `↓ data

choice: Choice()
current: 'a' … ∆ choice … choice
[current data]`,
    );
    const project = Project.make(
        null,
        'test',
        main,
        [new Source('data', `1`)],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.getInitialValue();
    evaluator.play();

    expect(evaluator.getLatestSourceValue(main)?.toString()).toBe('["a" 1]');

    for (const name of ['b', 'c']) {
        evaluator.singletonReact(Choice, (stream) => stream.react(name));
        expect(evaluator.exception).toBeUndefined();
        const value = evaluator.getLatestSourceValue(main);
        expect(value).not.toBeInstanceOf(ExceptionValue);
        // The borrowed name must still be bound after the reevaluation.
        expect(value?.toString()).toBe(`["${name}" 1]`);
    }

    evaluator.stop();
});

/* -------------------------------------------------------------------------- */
/* Kits (#8)                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A project that borrows a kit, with the kit already resolved.
 *
 * This is the seam the whole feature turns on: a kit is fetched and parsed into a `Source`
 * *before* the Project exists, so `Project.getShare` — which every borrow in the language
 * funnels through — stays synchronous. Nothing here touches the network, which is why all
 * of this is a unit test rather than an e2e one.
 */
function projectWithKit(
    code: string,
    kitCode: string,
    {
        username = 'amy',
        name = 'colors',
        version = 1,
        status = 'loaded',
    }: Partial<{
        username: string;
        name: string;
        version: number;
        status: Dependency['status'];
    }> = {},
) {
    const kit = new Source(name, kitCode);
    const dependency: Dependency =
        status === 'loaded'
            ? { status: 'loaded', source: kit, kit: 'kit-id', version }
            : { status };
    return Project.make(
        null,
        'test',
        new Source('main', code),
        [],
        DefaultLocale,
    ).withDependencies(
        new Map([[dependencyKey({ username, name }, version), dependency]]),
    );
}

/**
 * The names of every conflict the project reports.
 *
 * Project-wide rather than per node, for the reason `testConflict` gives: a conflict is
 * attributed to whichever node best explains it — here, the `@amy/colors` token rather
 * than the `Borrow` around it — and which node that is isn't what these cases are about.
 */
function conflictNames(project: Project): string[] {
    return project.analyze().conflicts.map((c) => c.constructor.name);
}

/** Whether the project's `→` found a conversion, rather than failing to. */
function convertsCleanly(project: Project): boolean {
    const value = new Evaluator(project, DB, [DefaultLocale]).getInitialValue();
    return value !== undefined && !(value instanceof ExceptionValue);
}

function valueOf(project: Project) {
    return new Evaluator(project, DB, [DefaultLocale])
        .getInitialValue()
        ?.toString();
}

test.each([
    // One named export.
    [`↓ @amy/colors.sunset 1\nsunset`, `↑ sunset/en: 1`, '1'],
    // Every export at once, which is what borrowing a kit with no name after it means.
    [`↓ @amy/colors 1\nsunset + dawn`, `↑ sunset/en: 1\n↑ dawn/en: 2`, '3'],
    // A shared function.
    [`↓ @amy/colors.double 1\ndouble(3)`, `↑ ƒ double(n•#) n · 2`, '6'],
])('a kit borrow evaluates: %s', (code, kitCode, expected) => {
    expect(valueOf(projectWithKit(code, kitCode))).toBe(expected);
});

test('a kit that is still loading reports no conflict', () => {
    const project = projectWithKit(`↓ @amy/colors.sunset 1\nsunset`, ``, {
        status: 'loading',
    });
    // An unresolved borrow is an Error-severity conflict, so without the loading state
    // every project using a kit would flash red on open and then quietly go green.
    expect(project.dependenciesSettled()).toBe(false);
    expect(conflictNames(project)).not.toContain('UnknownKit');
    expect(conflictNames(project)).not.toContain('UnavailableKit');
    expect(conflictNames(project)).not.toContain('UnknownBorrow');
});

const unresolved: [Dependency['status'], string][] = [
    ['missing', 'UnknownKit'],
    ['blocked', 'UnavailableKit'],
];
test.each(unresolved)('a %s kit reports %s', (status, conflict) => {
    const project = projectWithKit(`↓ @amy/colors.sunset 1\nsunset`, ``, {
        status,
    });
    expect(conflictNames(project)).toContain(conflict);
});

test('a kit borrowed without a version reports MissingKitVersion', () => {
    const project = projectWithKit(
        `↓ @amy/colors.sunset\nsunset`,
        `↑ sunset/en: 1`,
    );
    expect(conflictNames(project)).toContain('MissingKitVersion');
});

test('one kit at two versions in one source is a conflict', () => {
    const project = projectWithKit(
        `↓ @amy/colors.sunset 1\n↓ @amy/colors.dawn 2\nsunset`,
        `↑ sunset/en: 1`,
    );
    expect(conflictNames(project)).toContain('ConflictingKitVersions');
});

/**
 * A conversion can't travel through a borrow's name — `Convert` finds one by matching
 * types, and a ConversionDefinition has no name at all. So a kit's `↑` conversions become
 * ambient in whatever source borrowed the kit.
 */
test('a kit shares a conversion with the source that borrows it', () => {
    const project = projectWithKit(
        `↓ @amy/units.tag 1\n10kitty → #cat`,
        `↑ tag/en: 1\n↑ → #kitty #cat ⬚ ÷ 2`,
        { name: 'units' },
    );
    // Succeeding at all is the evidence: the basis has no path between two units a
    // creator invented, so the only conversion that could satisfy this is the kit's.
    expect(convertsCleanly(project)).toBe(true);
});

test('a conversion is not ambient in a source that did not borrow the kit', () => {
    const project = projectWithKit(
        `10kitty → #cat`,
        `↑ tag/en: 1\n↑ → #kitty #cat ⬚ ÷ 2`,
        { name: 'units' },
    );
    // Gating on the borrow is what keeps a kit's conversions from leaking into every
    // project that happens to have resolved it.
    expect(convertsCleanly(project)).toBe(false);
});

test('an unshared conversion in a kit stays private to it', () => {
    const project = projectWithKit(
        `↓ @amy/units.tag 1\n10kitty → #cat`,
        `↑ tag/en: 1\n→ #kitty #cat ⬚ ÷ 2`,
        { name: 'units' },
    );
    expect(convertsCleanly(project)).toBe(false);
});

test("a kit's permissions reach the creator who borrows it", () => {
    // Someone else's code runs in your browser, so the microphone notice a creator sees
    // has to account for what their kits do, not only what they wrote themselves.
    const project = projectWithKit(
        `↓ @amy/ears.loudness 1\nloudness`,
        `↑ loudness/en: Volume()`,
        { name: 'ears' },
    );
    expect([...project.getRequiredPermissions()]).toContain('microphone');
});

/* -------------------------------------------------------------------------- */
/* Completing a kit borrow                                                     */
/* -------------------------------------------------------------------------- */

function completionsFor(code: string, anchorIndex: number) {
    const source = new Source('main', code);
    const project = Project.make(null, 't', source, [], DefaultLocale);
    const borrow = source.expression.borrows[0];
    const anchor = borrow.nodes().filter((n) => n instanceof Token)[
        anchorIndex
    ];
    if (anchor === undefined) throw new Error(`no token at ${anchorIndex}`);
    return borrow
        .getPossibleCompletions(anchor, {
            context: project.getContext(source),
            locales: DefaultLocales,
            kits: [
                { name: 'amy/colors', version: 3 },
                { name: 'amy/units', version: 1 },
                { name: 'bo/shapes', version: 2 },
            ],
        })
        .map((b) => b.toWordplay(getPreferredSpaces(b)));
}

test('a bare ↓ offers every kit, with its newest version', () => {
    // The version is part of the offer: a borrow without one is a conflict, and the
    // creator has no way to know what versions exist.
    expect(completionsFor(`↓ `, 0)).toEqual([
        '↓ @amy/colors 3',
        '↓ @amy/units 1',
        '↓ @bo/shapes 2',
    ]);
});

test('a partly typed kit narrows the offer', () => {
    expect(completionsFor(`↓ @amy/c`, 1)).toEqual(['↓ @amy/colors 3']);
});

test('a borrow completion round-trips through the tokenizer', () => {
    // The menu drops any suggestion that reprints as a different program, so a
    // completion that does not reparse would silently never be offered.
    for (const printed of completionsFor(`↓ `, 0)) {
        const reparsed = new Source('t', printed).expression.borrows[0];
        expect(reparsed.getKitRef()).not.toBeUndefined();
        expect(reparsed.getVersion()).not.toBeUndefined();
    }
});

test('no kits means no offers', () => {
    const source = new Source('main', `↓ `);
    const project = Project.make(null, 't', source, [], DefaultLocale);
    expect(
        source.expression.borrows[0].getPossibleCompletions(
            source.expression.borrows[0].borrow,
            { context: project.getContext(source), locales: DefaultLocales },
        ),
    ).toEqual([]);
});

test('a bind-all kit borrow puts its shares in scope, not just in the evaluation', () => {
    // Evaluation and scope are two different questions, and the evaluation tests above
    // passed for a long time while the editor reported `sunset` as an unknown name:
    // `Program.getDefinitions` was pushing the kit's *source* into scope instead of its
    // shares, so the name bound at runtime and resolved nowhere at check time. A creator
    // sees the check, not the runtime.
    const project = projectWithKit(
        `↓ @amy/colors 1\nsunset + dawn`,
        `↑ sunset/en: 1\n↑ dawn/en: 2`,
    );
    expect(conflictNames(project)).toEqual([]);
});

test('a named kit borrow puts only that share in scope', () => {
    const project = projectWithKit(
        `↓ @amy/colors.sunset 1\nsunset`,
        `↑ sunset/en: 1\n↑ dawn/en: 2`,
    );
    expect(conflictNames(project)).toEqual([]);
    // `dawn` was not asked for, so it is not in scope.
    const other = projectWithKit(
        `↓ @amy/colors.sunset 1\ndawn`,
        `↑ sunset/en: 1\n↑ dawn/en: 2`,
    );
    expect(other.analyze().conflicts.length).toBeGreaterThan(0);
});

describe('a kit is reachable through its own name (#1373)', () => {
    // Check time and run time are two different questions, and the pair above exists
    // because they disagreed once. Every case here asserts both: no conflict, and the
    // value the namespace actually produces.
    test('an export resolves and evaluates through the kit name', () => {
        const project = projectWithKit(
            `↓ @amy/colors 1\ncolors.sunset`,
            `↑ sunset/en: 1\n↑ dawn/en: 2`,
        );
        expect(conflictNames(project)).toEqual([]);
        expect(valueOf(project)).toBe('1');
    });

    test('two kits sharing a name are told apart by it', () => {
        // The case the feature exists for, and the only one that proves it: with a single
        // kit, a bare borrow binds `sunset` flat, so `colors.sunset` resolves through the
        // enclosing scope whether or not a namespace exists. Two kits make the flat name
        // ambiguous, so each answer can only come from the kit it was asked of.
        const amy = new Source('colors', `↑ sunset/en: 1`);
        const bo = new Source('palette', `↑ sunset/en: 2`);
        const project = Project.make(
            null,
            'test',
            new Source(
                'main',
                `↓ @amy/colors 1\n↓ @bo/palette 1\ncolors.sunset · palette.sunset`,
            ),
            [],
            DefaultLocale,
        ).withDependencies(
            new Map([
                [
                    dependencyKey({ username: 'amy', name: 'colors' }, 1),
                    {
                        status: 'loaded',
                        source: amy,
                        kit: 'amy-kit',
                        version: 1,
                    } satisfies Dependency,
                ],
                [
                    dependencyKey({ username: 'bo', name: 'palette' }, 1),
                    {
                        status: 'loaded',
                        source: bo,
                        kit: 'bo-kit',
                        version: 1,
                    } satisfies Dependency,
                ],
            ]),
        );
        // 1 · 2 — each `sunset` came from the kit it was named on.
        expect(valueOf(project)).toBe('2');
    });

    test('the flat names still work, so nothing that parses today changes', () => {
        // Three shipped examples use a kit export by bare name after a bare borrow.
        const project = projectWithKit(
            `↓ @amy/colors 1\nsunset + colors.dawn`,
            `↑ sunset/en: 1\n↑ dawn/en: 2`,
        );
        expect(conflictNames(project)).toEqual([]);
        expect(valueOf(project)).toBe('3');
    });

    test('a shared function is callable through the kit name', () => {
        const project = projectWithKit(
            `↓ @amy/colors 1\ncolors.double(3)`,
            `↑ ƒ double(n•#) n · 2`,
        );
        expect(conflictNames(project)).toEqual([]);
        expect(valueOf(project)).toBe('6');
    });

    test("a kit's private helper is not reachable through its name", () => {
        // The whole point of restricting `KitType.getDefinition` to `getShare` rather
        // than letting it walk the kit's own scope: a helper the author didn't share is
        // not the borrower's to reach, at check time or at run time.
        const project = projectWithKit(
            `↓ @amy/colors 1\ncolors.secret`,
            `secret: 1\n↑ sunset/en: 2`,
        );
        expect(conflictNames(project).length).toBeGreaterThan(0);
    });

    test('a name the kit does not share at all is a conflict', () => {
        const project = projectWithKit(
            `↓ @amy/colors 1\ncolors.nope`,
            `↑ sunset/en: 1`,
        );
        expect(conflictNames(project).length).toBeGreaterThan(0);
    });

    test('a shared structure can be annotated through the kit name', () => {
        // The half of #1373 that values and functions don't need: a structure is named in
        // a *type* annotation, and `NameType` had no dotted form, so a structure two kits
        // both share left one of them impossible to annotate.
        const project = projectWithKit(
            `↓ @amy/colors 1\ns•colors.Sprite: Sprite(1)\ns.x`,
            `↑ •Sprite/en(x/en•#)`,
        );
        expect(conflictNames(project)).toEqual([]);
        expect(valueOf(project)).toBe('1');
    });

    test('a local source keeps binding its own value, not a namespace', () => {
        // `Lyrics.wp` has 41 bare local borrows used directly as values, so this is the
        // invariant that makes the change additive rather than breaking.
        const project = Project.make(
            null,
            'test',
            new Source('main', `↓ notes\nnotes`),
            [new Source('notes', `1 + 2`)],
            DefaultLocale,
        );
        expect(valueOf(project)).toBe('3');
    });
});

test('a published source raises KitCannotBorrow on every Borrow', () => {
    // No transitive dependencies in v1, and the rule belongs on the `↓` it is about
    // rather than in a checklist somewhere else (#8).
    const project = projectWithKit(
        `↓ @amy/colors 1\n¶A kit. \\1\\¶\n↑ mine/en: sunset`,
        `↑ sunset/en: 1`,
    ).withKitID('a-kit');
    expect(conflictNames(project)).toContain('KitCannotBorrow');

    // The same borrow in a source nobody publishes is perfectly ordinary.
    const unpublished = projectWithKit(
        `↓ @amy/colors 1\n¶A kit. \\1\\¶\n↑ mine/en: sunset`,
        `↑ sunset/en: 1`,
    );
    expect(conflictNames(unpublished)).not.toContain('KitCannotBorrow');
});

test('a published source may not borrow a local source either', () => {
    // A published source is the only file its readers get, so a `↓` naming a source
    // that stays behind is as unresolvable for them as a kit would be.
    const project = Project.make(
        null,
        'test',
        new Source('main', `↓ helper\n¶A kit. \\1\\¶\n↑ mine/en: 1`),
        [new Source('helper', `↑ thing/en: 1`)],
        DefaultLocale,
    ).withKitID('a-kit');
    expect(conflictNames(project)).toContain('KitCannotBorrow');
});

test('a kit borrow that is also illegal here reports both conflicts', () => {
    // The version branches used to `return` a fresh array, dropping the KitCannotBorrow
    // pushed above them — so the one thing most worth saying went unsaid.
    const project = projectWithKit(
        `↓ @amy/colors.sunset\n¶A kit. \\1\\¶\n↑ mine/en: sunset`,
        `↑ sunset/en: 1`,
    ).withKitID('a-kit');
    const names = conflictNames(project);
    expect(names).toContain('MissingKitVersion');
    expect(names).toContain('KitCannotBorrow');
});
