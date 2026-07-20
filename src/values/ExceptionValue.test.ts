import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import BlankException from '@values/BlankException';
import ExceptionValue from '@values/ExceptionValue';
import MessageException from '@values/MessageException';
import NameException from '@values/NameException';
import { expect, test } from 'vitest';

test.each([
    ['boop', NameException, 'unknown name'],
    ['', BlankException, 'empty program'],
])(
    'Expect %s to produce an exception described as %s',
    (code, kind, description) => {
        const value = evaluateCode(code);
        expect(value).toBeInstanceOf(kind);
        if (value instanceof ExceptionValue) {
            expect(value.getExceptionDescription(DefaultLocales).toText()).toBe(
                description,
            );
            // The specific description, not the generic concept name, should be used.
            expect(
                value.getExceptionDescription(DefaultLocales).toText(),
            ).not.toBe('exception');
        }
    },
);

test('MessageException describes itself generically, not with its message', () => {
    const value = evaluateCode('boop');
    expect(value).toBeInstanceOf(ExceptionValue);
    if (value instanceof ExceptionValue) {
        const message = new MessageException(
            value.creator,
            value.evaluator,
            'something went wrong',
        );
        expect(message.getExceptionDescription(DefaultLocales).toText()).toBe(
            'exception',
        );
        expect(message.getExplanation(DefaultLocales).toText()).toBe(
            'something went wrong',
        );
    }
});
