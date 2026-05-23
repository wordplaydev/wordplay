import { expect, test } from 'vitest';
import { routeRequiresFirebase } from './routeRequiresFirebase';

test.each([
    // Firebase-dependent routes
    ['/login', true],
    ['/login/', true],
    ['/login/finish', true],
    ['/projects', true],
    ['/projects/', true],
    ['/galleries', true],
    ['/gallery/abc123', true],
    ['/teach', true],
    ['/teach/class/new', true],
    ['/characters', true],
    ['/character/xyz', true],
    ['/profile', true],
    ['/join', true],
    ['/moderate', true],

    // Editor and static routes — must remain interactive offline
    ['/', false],
    ['/project/abc', false],
    ['/project/abc/edit', false],
    ['/learn', false],
    ['/guide', false],
    ['/about', false],
    ['/rights', false],
    ['/donate', false],
    ['/thanks', false],
    ['/updates', false],
    ['/design', false],
    ['/localize', false],

    // Locale-prefixed variants strip correctly
    ['/en-US/projects', true],
    ['/en-US/project/abc', false],
    ['/es-MX/login', true],
    ['/en-US+es-MX/galleries', true],
    ['/en-US/', false],
    ['/en-US', false],

    // Non-locale first segment should NOT be stripped
    ['/notalocale/projects', false],
])('routeRequiresFirebase(%s) === %s', (pathname, expected) => {
    expect(routeRequiresFirebase(pathname)).toBe(expected);
});
