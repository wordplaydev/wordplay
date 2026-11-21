import { getCauseResolutions, groupByCause } from '#conflicts/causes.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';

function causes(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const conflicts = project.getConflicts() ?? [];
    return {
        conflicts: conflicts.map((conflict) => conflict.constructor.name),
        causes: groupByCause(conflicts, (node) => source.has(node)).map(
            (cause) =>
                `${cause.conflict.constructor.name}+${cause.echoes.length}`,
        ),
    };
}

test('a name that is not defined is one mistake, however many places use it', () => {
    const result = causes(
        "•Cat(name•'')\na: Kat('a')\nb: Kat('b')\nc: Kat('c')\n[a b c]",
    );
    // Every use is still a conflict, to be underlined where it is.
    expect(
        result.conflicts.filter((name) => name === 'UnknownName').length,
    ).toBe(3);
    expect(result.causes).toContain('UnknownName+2');
});

test('different names that are not defined are different mistakes', () => {
    expect(causes('kat + dog').causes).toEqual([
        'UnknownName+0',
        'UnknownName+0',
    ]);
});

test('inputs that do not fit a definition the creator wrote are one mistake', () => {
    const result = causes(
        "•Cat(name•'' age•#)\na: Cat('a')\nb: Cat('b')\n[a b]",
    );
    expect(result.causes).toEqual(['MissingInput+1']);
});

test('inputs that do not fit a built-in are each their own mistake', () => {
    expect(causes('[Phrase() Phrase()]').causes).toEqual([
        'MissingInput+0',
        'MissingInput+0',
    ]);
});

test('a comparison with something unknown is not reported again', () => {
    // The name is the mistake. That it then isn't a number is not another one.
    expect(causes('a•#: kat\na').conflicts).toEqual(['UnknownName']);
    expect(causes('kat•#').conflicts).toEqual(['UnknownName']);
});

test('renaming a name that is not defined renames it everywhere it is used', () => {
    const code = "•Cat(name•'')\ncats•[Kat]: [Kat('a') Kat('b')]\ncats";
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const context = project.getContext(source);
    const [cause] = groupByCause(project.getConflicts() ?? [], (node) =>
        source.has(node),
    );
    expect(cause?.echoes.length).toBe(2);
    if (cause === undefined) return;
    const repair = getCauseResolutions(cause, context, []).find(
        (resolution) => resolution.kind === 'repair',
    );
    expect(repair).toBeDefined();
    if (repair === undefined) return;
    const repaired = repair
        .mediator(context, DefaultLocales)
        .newProject.getSources()[0]!
        .getCode()
        .toString();
    // The type and both evaluations, not only the one the conflict is shown on.
    expect(repaired.replace(/\s+/gu, '')).toBe(
        code.replaceAll('Kat', 'Cat').replace(/\s+/gu, ''),
    );
});
