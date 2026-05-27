import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import { UnknownName } from '@conflicts/UnknownName';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';

/**
 * Returns the set of conflict constructor names for a program. Using names
 * rather than instances keeps assertions readable; the constructor identity is
 * what {@link Conflict.isEqualTo} relies on for dedup.
 */
function conflictKinds(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    return source.expression
        .getAllConflicts(context)
        .map((c) => c.constructor.name);
}

describe('#1146 — type-rooted cascade suppression', () => {
    test('`a ? ??` reports UnknownName + UnparsableConflict, not ExpectedBooleanCondition', () => {
        const kinds = conflictKinds('a ? ??');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds).toContain(UnparsableConflict.name);
        expect(kinds).not.toContain(ExpectedBooleanCondition.name);
    });

    test('`foo()` reports UnknownName, not IncompatibleInput on the call', () => {
        const kinds = conflictKinds('foo()');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds.filter((k) => k === IncompatibleInput.name)).toEqual([]);
    });

    test('`1 + foo` reports UnknownName on `foo`, not IncompatibleInput on `+`', () => {
        const kinds = conflictKinds('1 + foo');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds.filter((k) => k === IncompatibleInput.name)).toEqual([]);
    });

    test('`foo[1]` reports UnknownName, not IncompatibleInput on the list access', () => {
        const kinds = conflictKinds('foo[1]');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds.filter((k) => k === IncompatibleInput.name)).toEqual([]);
    });

    test('typed Bind with an unknown value reports UnknownName only, not IncompatibleType', () => {
        // `a•#: foo` — declare `a` as number, initialize from unknown `foo`.
        // The IncompatibleType would otherwise fire because `foo`'s type is
        // UnknownNameType, which `#` doesn't accept.
        const kinds = conflictKinds('a•#: foo');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds).not.toContain(IncompatibleType.name);
    });

    test('Reaction with an unknown condition reports UnknownName, not ExpectedBooleanCondition', () => {
        // `a … foo 2` — Reaction with condition `foo` (unknown).
        const kinds = conflictKinds('a: 1\na … foo 2');
        expect(kinds).toContain(UnknownName.name);
        expect(kinds).not.toContain(ExpectedBooleanCondition.name);
    });

    test('genuine type mismatches still fire (no false suppression)', () => {
        // `1 < ""` — both operands have real (non-UnknownType) types, the `<`
        // function isn't defined for that signature. Should still produce a
        // type-mismatch conflict.
        const kinds = conflictKinds('1 < ""');
        expect(kinds).toContain(IncompatibleInput.name);
    });

    test('a real conditional with a real non-boolean still fires ExpectedBooleanCondition', () => {
        // `1 ? 2 3` — condition is number, not boolean, no UnknownType upstream.
        const kinds = conflictKinds('1 ? 2 3');
        expect(kinds).toContain(ExpectedBooleanCondition.name);
    });

    test('end-to-end demo program produces only root-cause conflicts', () => {
        // Exercises Reference (operator), BinaryEvaluate, Bind (UnknownType
        // propagation), ListAccess, Conditional, Update, IncompatibleCellType,
        // and the restored BinaryEvaluate fun-undefined conflict on
        // `age < ""`. Four root causes, no cascades.
        const code = `unknown: missing + 10
players: ['alice' 'bob' notfound]
players[unknown] ? "ok" "fail"
table: ⎡name•"" age•#⎦
table ⎡: name: 25 ⎦ age < ""`;
        const kinds = conflictKinds(code);
        expect(kinds.sort()).toEqual(
            [
                'IncompatibleCellType',
                'IncompatibleInput',
                'UnknownName',
                'UnknownName',
            ].sort(),
        );
    });
});
