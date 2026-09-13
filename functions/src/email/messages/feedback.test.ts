import { describe, expect, test } from 'vitest';
import { feedbackMessage, renderFeedbackEmail } from './feedback.js';

/**
 * Feedback is the one email whose body is written by a stranger: anyone signed
 * in can create a feedback document. Its old version interpolated the title and
 * description straight into HTML, and nothing tested it — this file is the
 * other half of moving it onto the shared template.
 */

describe('creator text is data, not markup', () => {
    test('a script tag arrives as characters', () => {
        const { html } = renderFeedbackEmail(
            { title: '<script>alert(1)</script>', description: 'ordinary' },
            'f1',
        );
        expect(html).not.toContain('<script>alert');
        expect(html).toContain('&lt;script&gt;');
    });

    test('and so does an attribute break-out', () => {
        const { html } = renderFeedbackEmail(
            {
                title: 'ordinary',
                description: '"><img src=x onerror=alert(1)>',
            },
            'f1',
        );
        expect(html).not.toContain('<img src=x');
    });
});

describe('bounds', () => {
    test('a pasted wall of text is clipped', () => {
        const { text } = renderFeedbackEmail(
            { title: 'ordinary', description: 'x'.repeat(10_000) },
            'f1',
        );
        expect(text.length).toBeLessThan(6_000);
        expect(text).toContain('…');
    });

    test('a long title is clipped harder than a description', () => {
        const message = feedbackMessage(
            { title: 'y'.repeat(1_000), description: 'ordinary' },
            'f1',
        );
        const heading = message.blocks.find(
            (block) => block.kind === 'heading',
        );
        expect(heading?.kind === 'heading' && heading.text.length).toBeLessThan(
            250,
        );
    });
});

describe('what it carries', () => {
    test('the context a maintainer needs, which the old mail dropped', () => {
        const { text } = renderFeedbackEmail(
            {
                title: 'It broke',
                description: 'When I pressed play',
                type: 'defect',
                url: 'https://wordplay.dev/project/abc',
                browser: 'Firefox 140',
            },
            'f1',
        );
        for (const piece of [
            'It broke',
            'When I pressed play',
            'defect',
            'https://wordplay.dev/project/abc',
            'Firefox 140',
        ])
            expect(text).toContain(piece);
    });

    test('and says nothing about fields a document happens to lack', () => {
        // Read defensively off the raw document: `Feedback` is a zod type in
        // `src/`, which `functions/` cannot import.
        const { text } = renderFeedbackEmail(
            { title: 'It broke', description: 'When I pressed play' },
            'f1',
        );
        expect(text).not.toContain('undefined');
    });
});

describe('the link back to it', () => {
    test('opens the dialog and picks this entry out of the list', async () => {
        // Two parameters, because the feedback dialog holds every report: the
        // first opens it, the second says which one. Whoever reads hi@ should
        // land on the report, not on the list.
        const { html } = renderFeedbackEmail(
            { title: 'It broke', description: 'When I pressed play' },
            'abc-123',
        );
        expect(html).toContain('?dialog=feedback&amp;feedback=abc-123');
    });

    test('the id is escaped, so an odd one cannot break the URL', async () => {
        const { html } = renderFeedbackEmail(
            { title: 'It broke', description: 'When I pressed play' },
            'a b&c',
        );
        expect(html).toContain('feedback=a%20b%26c');
    });

    test('and it is a button as well as visible text', async () => {
        // The button is what gets pressed; the visible URL is what survives a
        // client that blocks or recolors it.
        const { html, text } = renderFeedbackEmail(
            { title: 'It broke', description: 'When I pressed play' },
            'abc-123',
        );
        expect(html).toContain('Read it in Wordplay');
        expect(text).toContain('?dialog=feedback&feedback=abc-123');
    });

    test('every feedback email has one, because every document has an id', async () => {
        // `id` is a required argument rather than an optional one. When it was
        // optional, the contact sheet's sample left it out and rendered a
        // version of this email with no link — a version nobody is ever sent.
        const { html } = renderFeedbackEmail(
            { title: 'It broke', description: 'When I pressed play' },
            'f1',
        );
        expect(html).toContain('dialog=feedback');
    });
});
