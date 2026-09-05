import { describe, expect, test } from 'vitest';
import {
    DefaultCopy,
    renderSigninEmail,
    withoutAnnotations,
} from './signinEmail.js';

describe('write-status markers', () => {
    test.each([
        ['$?Sign in', 'Sign in'],
        ['$!Sign in', 'Sign in'],
        ['$~Sign in', 'Sign in'],
        // A value can carry more than one marker; none of them is copy.
        ['$~$!Sign in', 'Sign in'],
        ['Sign in', 'Sign in'],
        ['$? Sign in ', 'Sign in'],
    ])('%s reads as %s', (raw, clean) => {
        expect(withoutAnnotations(raw)).toBe(clean);
    });

    test('a marker inside the text is left alone', () => {
        // Only a leading marker is a status; `$` is otherwise ordinary text.
        expect(withoutAnnotations('Costs $5')).toBe('Costs $5');
    });
});

describe('rendering', () => {
    const link = 'https://wordplay.dev/login?oobCode=abc&mode=signIn';

    test('the link appears as a button and as plain text', () => {
        // Both forms are load-bearing: the button is what most people click,
        // and the visible URL is what makes the paste-the-link flow possible
        // when the mail is read on another device or in an installed app.
        const { html, text } = renderSigninEmail(link, DefaultCopy);
        expect(html).toContain(`href="${link.replace(/&/g, '&amp;')}"`);
        expect(html).toContain(link.replace(/&/g, '&amp;'));
        expect(text).toContain(link);
    });

    test('copy is HTML-escaped', () => {
        const { html } = renderSigninEmail(link, {
            ...DefaultCopy,
            heading: '<script>alert(1)</script>',
        });
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    test('the URL is escaped in the href, so a crafted link cannot break out', () => {
        const { html } = renderSigninEmail(
            'https://x.dev/"><script>alert(1)</script>',
            DefaultCopy,
        );
        expect(html).not.toContain('"><script>');
    });

    test('the subject is the copy’s subject', () => {
        expect(renderSigninEmail(link, DefaultCopy).subject).toBe(
            DefaultCopy.subject,
        );
    });

    test('the plain-text part carries every piece of the message', () => {
        // Some clients show only this, and a text part that omitted the
        // disclaimer would drop the one line that tells someone who did not ask
        // for this that they can ignore it.
        const { text } = renderSigninEmail(link, DefaultCopy);
        for (const piece of [
            DefaultCopy.heading,
            DefaultCopy.body,
            DefaultCopy.disclaimer,
        ])
            expect(text).toContain(piece);
    });

    test('the fallback copy is complete', () => {
        // A partly-filled email is worse than an English one, so every field
        // has a default rather than the object being a template.
        for (const [field, value] of Object.entries(DefaultCopy))
            expect(value, field).not.toBe('');
    });
});
