import { test, expect } from 'vitest';
import getPII from './getPII';

test.each([
    ['test@test.com', ['test@test.com']],
    ['My email is test@test.com!', ['test@test.com']],
    ['This is not an email', []],
    [
        'This is two emails: test@test.com other@test.com',
        ['test@test.com', 'other@test.com'],
    ],
    ['My phone is 123-3223', ['123-3223']],
    ['My phone is 235-123-3223', ['235-123-3223']],
    ['My phone is +1 235-123-3223', ['+1 235-123-3223']],
])('Expect %s to be %s', (text, pii) => {
    const matches = getPII(text);
    const joined = matches.map((m) => m.text).join();
    expect(joined).toBe(pii.join());
});
