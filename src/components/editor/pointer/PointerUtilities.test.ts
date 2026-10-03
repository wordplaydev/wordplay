import Project from '#db/projects/Project.ts';
import { AssignmentPoint, InsertionPoint } from '#edit/drag/Drag.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Bind from '#nodes/Bind.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Source from '#nodes/Source.ts';
import { must } from '#util/nullable.ts';
import { expect, test } from 'vitest';
import {
    getEmptyInsertionPoint,
    programEdgeIndex,
} from './PointerUtilities.ts';

function project(code: string) {
    const source = new Source('test', code);
    return {
        source,
        context: Project.make(
            null,
            'test',
            source,
            [],
            DefaultLocale,
        ).getContext(source),
    };
}

test('an unset field offers an assignment point for a run that fits', () => {
    // Regressed in fd140c343: the candidate became a run (Node[]) and the
    // field was asked whether it allows the array, which no field does, so no
    // empty single-value field in blocks mode could ever receive a drop.
    // A function input is a bind with no value; `a•#` alone would be an is-test.
    const { source, context } = project('ƒ f(a) 1');
    const bind = must(source.find(Bind), 'a bind');
    const one = must(source.find(NumberLiteral), 'a number');
    const point = getEmptyInsertionPoint(bind, 'value', [one], context);
    expect(point).toBeInstanceOf(AssignmentPoint);
    expect(point instanceof AssignmentPoint && point.field).toBe('value');
});

test('an empty list offers an insertion point at its start', () => {
    const { source, context } = project('[]\n1');
    const list = must(source.find(ListLiteral), 'a list');
    const one = must(source.find(NumberLiteral), 'a number');
    const point = getEmptyInsertionPoint(list, 'values', [one], context);
    expect(point).toBeInstanceOf(InsertionPoint);
    expect(point instanceof InsertionPoint && point.index).toBe(0);
});

test('a root block dropped on an empty program replaces the program', () => {
    const { source, context } = project('');
    const other = new Source('other', '1\n2');
    const point = getEmptyInsertionPoint(
        source.expression.expression,
        'statements',
        [other.expression.expression],
        context,
    );
    expect(point).toBeInstanceOf(AssignmentPoint);
    expect(point instanceof AssignmentPoint && point.field).toBe('expression');
});

test('a pointer over no node is at the start or the end of the program', () => {
    // Below (or beside) the statements appends; above their start prepends.
    expect(programEdgeIndex(3, 100, 400)).toBe(3);
    expect(programEdgeIndex(3, 100, 40)).toBe(0);
    // No list to measure against (an empty program) is the end, which is 0.
    expect(programEdgeIndex(0, undefined, 40)).toBe(0);
});
