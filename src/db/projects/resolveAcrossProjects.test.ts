import { movedOutput } from '@components/palette/editOutput';
import Project from '@db/projects/Project';
import resolveAcrossProjects from '@db/projects/resolveAcrossProjects';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

function make(code: string) {
    return Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
}

function phraseIn(project: Project): Evaluate {
    const evaluate = project
        .getMain()
        .expression.nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(project.shares.output.Phrase, project.getNodeContext(n)),
        );
    if (evaluate === undefined) throw new Error('No Phrase in the program');
    return evaluate;
}

/** A project and the same project with its phrase moved — the two versions the
 *  stage and the editor can be looking at simultaneously. */
function moved(code: string) {
    const before = make(code);
    const phrase = phraseIn(before);
    const after = before.withRevisedNodes([
        [phrase, movedOutput(before, phrase, DefaultLocales, 5, 6, false)],
    ]);
    return { before, after, phrase };
}

test('an id already in the target project resolves to itself', () => {
    const project = make(`Phrase('hi')`);
    const phrase = phraseIn(project);
    expect(resolveAcrossProjects(project, project, phrase.id)).toBe(phrase);
});

/**
 * The case this exists for: a revision re-mints the revised node's whole chain
 * of ancestors, so the phrase the stage rendered has an id the revised project
 * has never heard of. Its path still leads to the phrase.
 */
test('a stale id resolves through its path to the revised node', () => {
    const { before, after, phrase } = moved(`Phrase('hi' place: Place(1m 2m))`);

    // The premise: the id really is gone from the revised project.
    expect(after.getNodeByID(phrase.id)).toBeUndefined();

    const resolved = resolveAcrossProjects(before, after, phrase.id);
    expect(resolved).toBeDefined();
    expect(resolved).toBe(phraseIn(after));
});

test('a node the revision deleted resolves to nothing', () => {
    const before = make(`Phrase('hi')`);
    const phrase = phraseIn(before);
    const after = before.withRevisedNodes([[phrase, undefined]]);
    expect(resolveAcrossProjects(before, after, phrase.id)).toBeUndefined();
});

test('an id from neither project resolves to nothing', () => {
    const { before, after } = moved(`Phrase('hi')`);
    expect(resolveAcrossProjects(before, after, -1)).toBeUndefined();
});

/** Resolution is by path, so it finds the right one of several like phrases —
 *  which identity comparison across projects never could. */
test('a stale id resolves to its own phrase, not a matching sibling', () => {
    const before = make(
        `Stage([Phrase('a' place: Place(0m 0m)) Phrase('a' place: Place(0m 0m))])`,
    );
    const phrases = before
        .getMain()
        .expression.nodes()
        .filter(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(before.shares.output.Phrase, before.getNodeContext(n)),
        );
    expect(phrases).toHaveLength(2);

    const second = phrases[1];
    const after = before.withRevisedNodes([
        [second, movedOutput(before, second, DefaultLocales, 5, 6, false)],
    ]);

    const resolvedFirst = resolveAcrossProjects(before, after, phrases[0].id);
    const resolvedSecond = resolveAcrossProjects(before, after, second.id);
    expect(resolvedFirst).toBeDefined();
    expect(resolvedSecond).toBeDefined();
    expect(resolvedFirst).not.toBe(resolvedSecond);
    // The moved one is the one carrying the new place.
    expect(resolvedSecond?.toWordplay()).toContain('5m');
    expect(resolvedFirst?.toWordplay()).not.toContain('5m');
});
