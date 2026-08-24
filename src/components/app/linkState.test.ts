import { describe, expect, test } from 'vitest';
import getLinkState, { withoutLocale } from './linkState';

describe('withoutLocale', () => {
    test.each([
        ['/en-US/guide', 'en-US', '/guide'],
        ['/en-US', 'en-US', '/'],
        ['/guide', undefined, '/guide'],
        // A path that doesn't actually start with the locale is left alone
        // rather than blindly sliced.
        ['/guide', 'en-US', '/guide'],
    ])('%s (%s) → %s', (pathname, locale, expected) => {
        expect(withoutLocale(pathname, locale)).toBe(expected);
    });
});

describe('a link to the page you are on', () => {
    test('is active on its own page', () => {
        expect(getLinkState('/en-US/guide', '', 'en-US', '/guide')).toEqual({
            active: true,
            inSection: true,
        });
    });

    test('is not active elsewhere', () => {
        expect(
            getLinkState('/en-US/galleries', '', 'en-US', '/guide').active,
        ).toBe(false);
    });

    test('home owns only itself', () => {
        expect(getLinkState('/en-US', '', 'en-US', '/')).toEqual({
            active: true,
            inSection: true,
        });
        // Every path starts with "/", so home must not claim all of them.
        expect(getLinkState('/en-US/guide', '', 'en-US', '/')).toEqual({
            active: false,
            inSection: false,
        });
    });
});

describe('a query selects content, so it decides "active" too', () => {
    test('a bare link is not active on a page with a query', () => {
        // /guide and /guide?concept=Phrase are different content: the bare link
        // still goes somewhere, so it stays a link.
        const state = getLinkState(
            '/en-US/guide',
            '?concept=Phrase',
            'en-US',
            '/guide',
        );
        expect(state.active).toBe(false);
        // ...but you are still in the guide, so the tab is still drawn.
        expect(state.inSection).toBe(true);
    });

    test('a link carrying the same query is active', () => {
        expect(
            getLinkState(
                '/en-US/guide',
                '?concept=Phrase',
                'en-US',
                '/guide?concept=Phrase',
            ).active,
        ).toBe(true);
    });

    test('a link carrying a different query is not active', () => {
        expect(
            getLinkState(
                '/en-US/guide',
                '?concept=Phrase',
                'en-US',
                '/guide?concept=Group',
            ).active,
        ).toBe(false);
    });

    test('parameter order does not matter', () => {
        expect(
            getLinkState(
                '/en-US/learn',
                '?tutorial=quick&act=1',
                'en-US',
                '/learn?act=1&tutorial=quick',
            ).active,
        ).toBe(true);
    });

    test('escaping does not matter', () => {
        expect(
            getLinkState(
                '/en-US/guide',
                '?concept=a%20b',
                'en-US',
                '/guide?concept=a+b',
            ).active,
        ).toBe(true);
    });

    test('a hash addresses a place within a page, not a different page', () => {
        expect(
            getLinkState('/en-US/about', '', 'en-US', '/about#credits').active,
        ).toBe(true);
    });
});

describe('sections', () => {
    test('a subpage keeps the section but is not the section page', () => {
        expect(
            getLinkState('/en-US/teach/class/abc', '', 'en-US', '/teach'),
        ).toEqual({ active: false, inSection: true });
    });

    test('a section whose subpages are named differently declares them', () => {
        // A project page is /project/…, not /projects/…, so the path alone
        // can't place it.
        expect(
            getLinkState('/en-US/project/abc', '', 'en-US', '/projects')
                .inSection,
        ).toBe(false);
        expect(
            getLinkState('/en-US/project/abc', '', 'en-US', '/projects', [
                '/project',
            ]),
        ).toEqual({ active: false, inSection: true });
    });

    test('a prefix only matches whole path segments', () => {
        // /projectile is not inside /project.
        expect(
            getLinkState('/en-US/projectile', '', 'en-US', '/projects', [
                '/project',
            ]).inSection,
        ).toBe(false);
    });

    test('a sibling section is not claimed', () => {
        expect(
            getLinkState('/en-US/galleries', '', 'en-US', '/guide').inSection,
        ).toBe(false);
    });
});
