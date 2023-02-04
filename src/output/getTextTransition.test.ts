import { test, expect } from 'vitest';
import { getTextTransition } from './getTextTransition';

test('Transitions', () => {
    expect(getTextTransition('hello', 'hi').join(' ')).toBe(
        'hello hell hel he h hi'
    );
    expect(getTextTransition('amy', 'ko').join(' ')).toBe('amy am a  k ko');
});
