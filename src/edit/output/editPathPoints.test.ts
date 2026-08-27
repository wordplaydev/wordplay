import {
    getPathPoints,
    withInsertedPathPoint,
    withMovedPathPoint,
    withoutPathPoint,
} from '@edit/output/editShape';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** The Path evaluate inside a program's Shape, with the context to revise it in. */
function setup(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const form = source.expression
        .nodes()
        .filter(
            (node): node is Evaluate =>
                node instanceof Evaluate &&
                node.is(project.shares.output.Path, context),
        )[0];
    if (form === undefined) throw new Error('no path in ' + code);
    return { project, context, form };
}

const Three = `Shape(Path([Place(0m 0m) Place(2m 0m) Place(2m 4m)]))`;

test('a path reads back the places it was written with', () => {
    const { project, context, form } = setup(Three);
    expect(getPathPoints(project, form, context)).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 4 },
    ]);
});

test('a computed point makes the whole path uneditable', () => {
    // A path is one shape: moving the points that happen to be literals and leaving a computed
    // one where it is would tear it apart, so the editor declines rather than half-applying.
    const { project, context, form } = setup(
        `n: 2m\nShape(Path([Place(0m 0m) Place(n 0m) Place(2m 4m)]))`,
    );
    expect(getPathPoints(project, form, context)).toBeUndefined();
    expect(
        withMovedPathPoint(project, form, context, 0, { x: 9, y: 9 }),
    ).toBeUndefined();
});

test('moving one point leaves the others alone', () => {
    const { project, context, form } = setup(Three);
    const moved = withMovedPathPoint(project, form, context, 1, {
        x: 5,
        y: -1,
    });
    expect(moved).toBeDefined();
    expect(moved && getPathPoints(project, moved, context)).toEqual([
        { x: 0, y: 0 },
        { x: 5, y: -1 },
        { x: 2, y: 4 },
    ]);
});

test('moving a point keeps the rest of its place, like its depth', () => {
    const { project, context, form } = setup(
        `Shape(Path([Place(0m 0m 3m) Place(2m 0m 3m)]))`,
    );
    const moved = withMovedPathPoint(project, form, context, 0, { x: 1, y: 1 });
    // The z is the part that has to survive: rebuilding the place positionally would drop it.
    expect(moved?.toWordplay().replace(/\s+/g, '')).toContain('Place(1m1m3m)');
});

test('a point subdivides the span that leaves it', () => {
    const { project, context, form } = setup(Three);
    const added = withInsertedPathPoint(
        project,
        form,
        context,
        0,
        DefaultLocales,
    );
    expect(added?.index).toBe(1);
    expect(added && getPathPoints(project, added.form, context)).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 4 },
    ]);
});

test('the last point of an open path halves the span before it', () => {
    // Otherwise the end of a path is the one point that can't be subdivided.
    const { project, context, form } = setup(Three);
    const added = withInsertedPathPoint(
        project,
        form,
        context,
        2,
        DefaultLocales,
    );
    expect(added).toBeDefined();
    expect(added && getPathPoints(project, added.form, context)).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 2, y: 4 },
    ]);
});

test('removing a point keeps the rest', () => {
    const { project, context, form } = setup(Three);
    const fewer = withoutPathPoint(project, form, context, 1);
    expect(fewer && getPathPoints(project, fewer, context)).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 4 },
    ]);
});

test('a path refuses to shrink below a line', () => {
    // One point draws nothing but is still selectable, which reads as the editor having eaten
    // the shape.
    const { project, context, form } = setup(
        `Shape(Path([Place(0m 0m) Place(2m 0m)]))`,
    );
    expect(withoutPathPoint(project, form, context, 0)).toBeUndefined();
});
