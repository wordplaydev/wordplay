import { expect, test } from 'vitest';
import { isAppPath, isExternalURL } from './appPath';

test.each([
    ['/', true],
    ['/guide', true],
    ['/guide?section=kits', true],
    ['/galleries?tab=public', true],
    ['/character/abc', true],
    ['/gallery/kim-p4/howto', true],
    ['/teach/class/new', true],
    ['/learn#top', true],
    ['/gide', false],
    ['/droits', false],
    ['/character/', false],
    ['/character/a/b', false],
    ['//design', false],
    ['/es-MX/guide', false],
])('isAppPath(%s) is %s', (path, expected) => {
    expect(isAppPath(path)).toBe(expected);
});

test.each([
    ['https://wordplay.dev', true],
    ['http://example.com', true],
    ['mailto:hi@wordplay.dev', true],
    ['javascript:alert(1)', false],
    ['/guide', false],
])('isExternalURL(%s) is %s', (url, expected) => {
    expect(isExternalURL(url)).toBe(expected);
});
