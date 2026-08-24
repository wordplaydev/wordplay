import { describe, expect, test } from 'vitest';
import linkHref from '@parser/linkHref';

describe('linkHref', () => {
    test('an ordinary web address is left alone', () => {
        expect(linkHref('https://wordplay.dev')).toBe('https://wordplay.dev');
        expect(linkHref('http://localhost:8080')).toBe('http://localhost:8080');
    });

    test('a bare email address gets the scheme nobody writes out', () => {
        expect(linkHref('hi@wordplay.dev')).toBe('mailto:hi@wordplay.dev');
    });

    test('an already-written mailto is left alone', () => {
        expect(linkHref('mailto:hi@wordplay.dev')).toBe(
            'mailto:hi@wordplay.dev',
        );
    });

    test('the schemeless form is an internal path', () => {
        // The site's own convention: `<guide@://guide>` links within Wordplay.
        expect(linkHref('://guide')).toBe('/guide');
        expect(linkHref('/guide')).toBe('/guide');
    });

    test('a scheme we do not allow is not a link', () => {
        // Documentation is written by creators and shown to everyone, and
        // nothing in it needs to run code.
        expect(linkHref('javascript:alert(1)')).toBeUndefined();
        expect(linkHref('data:text/html,<script>')).toBeUndefined();
        expect(linkHref('file:///etc/passwd')).toBeUndefined();
    });

    test('nonsense is not a link', () => {
        expect(linkHref('')).toBeUndefined();
        expect(linkHref('not a url')).toBeUndefined();
    });
});
