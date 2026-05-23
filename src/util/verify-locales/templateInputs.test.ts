import { describe, expect, test } from 'vitest';
import {
    checkTemplateInputs,
    getDeclaredInputs,
    getTemplateReferences,
} from '@util/verify-locales/templateInputs';

describe('getTemplateReferences', () => {
    const declared = new Set(['expected', 'given']);

    test('finds named mentions that match the declared set', () => {
        const { named } = getTemplateReferences(
            'expected $expected, got $given',
            declared,
        );
        expect([...named].sort()).toEqual(['expected', 'given']);
    });

    test('treats unknown names as terminology refs, not inputs', () => {
        // `$program` is in the locale terminology dictionary; not a template input.
        const { named, numeric } = getTemplateReferences(
            'I am a $program',
            declared,
        );
        expect([...named]).toEqual([]);
        expect([...numeric]).toEqual([]);
    });

    test('collects bare numeric refs (legacy syntax) separately', () => {
        // The migration to named refs is complete; any $N is now a regression.
        const { named, numeric } = getTemplateReferences(
            'Hello $1 and $2',
            declared,
        );
        expect([...named]).toEqual([]);
        expect([...numeric].sort()).toEqual([1, 2]);
    });

    test('ignores $$ escapes', () => {
        // $$ is an escape for a literal $, so $$20 should not produce a 20 reference.
        const { numeric } = getTemplateReferences('costs $$20 USD', declared);
        expect([...numeric]).toEqual([]);
    });

    test('de-duplicates repeated refs', () => {
        const { named } = getTemplateReferences(
            '$expected[$expected|none]',
            new Set(['expected']),
        );
        expect([...named]).toEqual(['expected']);
    });
});

describe('getDeclaredInputs', () => {
    test('records inputs for fields annotated with Template<[...]>', () => {
        const declarations = getDeclaredInputs();
        expect(
            declarations.get('node.Bind.conflict.IncompatibleType.explanation'),
        ).toEqual(['expected', 'given']);
        expect(
            declarations.get('node.Bind.conflict.IncompatibleType.resolution'),
        ).toEqual(['expected']);
    });

    test('records inputs at every use site of a shared alias', () => {
        // ConflictText is reused across many conflicts. The walker must record
        // entries under each conflict's path, not skip on subsequent visits.
        const declarations = getDeclaredInputs();
        expect(
            declarations.get('node.Bind.conflict.DuplicateShare.explanation'),
        ).toEqual(['duplicate']);
        expect(
            declarations.get('node.Borrow.conflict.BorrowCycle.explanation'),
        ).toEqual(['borrow']);
    });
});

describe('checkTemplateInputs', () => {
    test('returns undefined when the path has no Template declaration', () => {
        expect(
            checkTemplateInputs('not.a.real.path', 'Hello $expected'),
        ).toBeUndefined();
    });

    test('returns clean result when named refs match the declaration', () => {
        const result = checkTemplateInputs(
            'node.Bind.conflict.IncompatibleType.explanation',
            'I expected $expected, but received $given',
        );
        expect(result).toEqual({ numeric: [], unused: [], unknown: [] });
    });

    test('flags bare $N refs (legacy positional syntax)', () => {
        const result = checkTemplateInputs(
            'node.Bind.conflict.IncompatibleType.explanation',
            'I expected $1, but received $2',
        );
        expect(result?.numeric).toEqual([1, 2]);
        expect(result?.unused).toEqual(['expected', 'given']);
        expect(result?.unknown).toEqual([]);
    });

    test('flags declared inputs that the template never references', () => {
        const result = checkTemplateInputs(
            'node.Bind.conflict.IncompatibleType.explanation',
            'Generic error message without inputs',
        );
        expect(result?.numeric).toEqual([]);
        expect(result?.unused).toEqual(['expected', 'given']);
        expect(result?.unknown).toEqual([]);
    });

    test('flags $name refs that are neither declared nor terminology', () => {
        const result = checkTemplateInputs(
            'node.Bind.conflict.IncompatibleType.explanation',
            'I expected $expected, but received $expecte',
        );
        expect(result?.unknown).toEqual(['expecte']);
        expect(result?.unused).toEqual(['given']);
    });

    test('does not flag known terminology refs', () => {
        // `$project` is a terminology key, not a template input — should be ignored.
        const result = checkTemplateInputs(
            'node.Bind.conflict.IncompatibleType.explanation',
            'I expected $expected, but received $given in $project',
        );
        expect(result?.unknown).toEqual([]);
        expect(result?.unused).toEqual([]);
    });
});
