import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import AnyType from '#nodes/AnyType.ts';
import BooleanType from '#nodes/BooleanType.ts';
import CycleType from '#nodes/CycleType.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import ListType from '#nodes/ListType.ts';
import NumberType from '#nodes/NumberType.ts';
import Source from '#nodes/Source.ts';
import StreamType from '#nodes/StreamType.ts';
import TableType from '#nodes/TableType.ts';
import type Type from '#nodes/Type.ts';
import { expect, test } from 'vitest';

/** The types of a program's placeholders, in source order. */
function placeholderTypes(code: string): Type[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    return source
        .nodes()
        .filter((node) => node instanceof ExpressionPlaceholder)
        .map((placeholder) => placeholder.getType(context));
}

// A placeholder takes the type its parent's field requires, which is what lets the guide's
// templates leave `•?` off a conditional's condition.
test.each<[string, Function]>([
    ['_ ? 1 2', BooleanType],
    ['a: 1 … _ … a + 1', BooleanType],
    ['∆ _', StreamType],
    ['_[1]', ListType],
    ['[1 2][_]', NumberType],
    ['table: ⎡a•#⎦⎡1⎦\ntable ⎡?⎦ _', BooleanType],
    ['_ ⎡?⎦ ⊤', TableType],
])('the placeholder in %s is a %o', (code, kind) => {
    const types = placeholderTypes(code);
    expect(types.at(-1)).toBeInstanceOf(kind);
});

// An operator's right takes its input's type, so the guide needn't annotate it either.
test('the right of an operator takes the input type', () => {
    const [type] = placeholderTypes('1 + _');
    expect(type?.toWordplay()).toBe(`ø|#`);
});

// Where the field's type is read from the placeholder itself, asking would be a cycle.
test.each(['_ + 1', '{_}'])('the placeholder in %s is not a cycle', (code) => {
    const [type] = placeholderTypes(code);
    expect(type).not.toBeInstanceOf(CycleType);
    expect(type).toBeInstanceOf(AnyType);
});
