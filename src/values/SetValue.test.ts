import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Block, { BlockKind } from '@nodes/Block';
import Context from '@nodes/Context';
import SetType from '@nodes/SetType';
import Source from '@nodes/Source';
import {
    FALSE_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
    TRUE_SYMBOL,
} from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import { describe, expect, it, test } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import SetValue from './SetValue';

test.each([
    ['{} = {}', TRUE_SYMBOL],
    ['{1} = {1}', TRUE_SYMBOL],
    ['{1} = {1 2}', FALSE_SYMBOL],
    ['{1 2} = {1}', FALSE_SYMBOL],
    ['{1 2} ≠ {1}', TRUE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

describe('SetValue', () => {
    const mockRequestor = new Block([], BlockKind.Block);

    const value1 = new NumberValue(mockRequestor, 1);
    const value2 = new NumberValue(mockRequestor, 2);
    const value3 = new NumberValue(mockRequestor, 3);
    const setValue = new SetValue(mockRequestor, [value1, value2]);

    const source = new Source('test', '');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = new Context(project, source);

    describe('size', () => {
        it('should return the correct size of the set', () => {
            const sizeValue = setValue.size(mockRequestor);
            expect(sizeValue.num.toNumber()).toBe(2);
        });
    });

    describe('has', () => {
        it('should return true if the value exists in the set', () => {
            const hasValue = setValue.has(mockRequestor, value1);
            expect(hasValue.bool).toBeTruthy();
        });

        it('should return false if the value does not exist in the set', () => {
            const nonExistentValue = new NumberValue(mockRequestor, 3);
            const hasValue = setValue.has(mockRequestor, nonExistentValue);
            expect(hasValue.bool).toBeFalsy();
        });
    });

    describe('add', () => {
        it('should add a value to the set', () => {
            const newSetValue = setValue.add(mockRequestor, value3);
            expect(newSetValue.size(mockRequestor).num.toNumber()).toBe(3);
        });
    });

    describe('remove', () => {
        it('should remove a value from the set', () => {
            const newSetValue = setValue.remove(mockRequestor, value1);
            expect(newSetValue.size(mockRequestor).num.toNumber()).toBe(1);
        });

        it('should/cannot remove a value from the set if not present', () => {
            const newSetValue = setValue.remove(mockRequestor, value3);
            expect(newSetValue.size(mockRequestor).num.toNumber()).toBe(2);
        });
    });

    describe('union', () => {
        it('should return a union of two sets', () => {
            const newSetValue = new SetValue(mockRequestor, [value3]);
            const unionSet = setValue.union(mockRequestor, newSetValue);
            expect(unionSet.size(mockRequestor).num.toNumber()).toBe(3);
        });
    });

    describe('intersection', () => {
        it('should return the intersection of two sets', () => {
            const newSetValue = new SetValue(mockRequestor, [value1]);
            const intersectionSet = setValue.intersection(
                mockRequestor,
                newSetValue,
            );
            expect(intersectionSet.size(mockRequestor).num.toNumber()).toBe(1);
        });
    });

    describe('difference', () => {
        it('should return the difference of two sets', () => {
            const newSetValue = new SetValue(mockRequestor, [value1]);
            const differenceSet = setValue.difference(
                mockRequestor,
                newSetValue,
            );

            let hasValue = differenceSet.has(mockRequestor, value1);
            expect(hasValue.bool).toBeFalsy();

            hasValue = differenceSet.has(mockRequestor, value2);
            expect(hasValue.bool).toBeTruthy();

            expect(differenceSet.size(mockRequestor).num.toNumber()).toBe(1);
        });
    });

    describe('isEqualTo', () => {
        it('should return true for equal sets', () => {
            const anotherSetValue = new SetValue(mockRequestor, [
                value1,
                value2,
            ]);
            expect(setValue.isEqualTo(anotherSetValue)).toBeTruthy();
        });
    });

    describe('getType', () => {
        it('should return the correct type', () => {
            expect(setValue.getType(context)).toBeInstanceOf(SetType);
        });
    });

    describe('getBasisTypeName', () => {
        it('should return the correct basis type name', () => {
            expect(setValue.getBasisTypeName()).toBe('set');
        });
    });

    describe('getRepresentativeText', () => {
        it('should return the correct representative text', () => {
            expect(setValue.getRepresentativeText()).toBe(
                SET_OPEN_SYMBOL + SET_CLOSE_SYMBOL,
            );
        });
    });

    describe('getSize', () => {
        it('should return the correct size of the set', () => {
            expect(setValue.getSize()).toBe(2);
        });
    });
});
