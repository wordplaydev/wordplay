import { describe, expect, test } from 'vitest';
import {
    directionOf,
    escape,
    renderEmail,
    type EmailMessage,
} from './layout.js';

/**
 * Conventions the template has to keep, each closing a class rather than a
 * case. Most exist because an email client is not a browser: Gmail cannot
 * resolve a custom property, Outlook's Word engine cannot lay out `rem`, and
 * neither can be discovered by looking at the rendered page in Chrome.
 */

function message(over: Partial<EmailMessage> = {}): EmailMessage {
    return {
        subject: 'A subject',
        language: 'en-US',
        preheader: 'A preheader',
        blocks: [
            { kind: 'heading', text: 'A heading' },
            { kind: 'paragraph', text: 'A paragraph' },
            {
                kind: 'button',
                label: 'Press me',
                url: 'https://wordplay.dev/x',
            },
            { kind: 'url', url: 'https://wordplay.dev/x' },
            { kind: 'note', text: 'A note' },
            { kind: 'field', label: 'Label', value: 'Value' },
        ],
        manageURL: undefined,
        manageLabel: undefined,
        ...over,
    };
}

describe('escaping', () => {
    test('copy cannot carry markup into the message', () => {
        const { html } = renderEmail(
            message({
                blocks: [{ kind: 'heading', text: '<script>x</script>' }],
            }),
        );
        expect(html).not.toContain('<script>x');
        expect(html).toContain('&lt;script&gt;');
    });

    test('a crafted URL cannot break out of its href', () => {
        const { html } = renderEmail(
            message({
                blocks: [
                    {
                        kind: 'button',
                        label: 'Go',
                        url: 'https://x.dev/"><script>alert(1)</script>',
                    },
                ],
            }),
        );
        expect(html).not.toContain('"><script>');
    });

    test('escape leaves ordinary text alone', () => {
        expect(escape('Costs $5 & up')).toBe('Costs $5 &amp; up');
    });
});

describe('what an email client can actually render', () => {
    const { html } = renderEmail(message());

    test('no custom properties, which Gmail renders as nothing', () => {
        expect(html).not.toContain('var(');
    });

    test('no rem, which Outlook cannot lay out', () => {
        expect(html).not.toMatch(/\d(?:\.\d+)?rem/);
    });

    test('every layout table says it is presentational', () => {
        // A screen reader must not announce the shell as a data table.
        const tables = html.match(/<table[^>]*>/g) ?? [];
        expect(tables.length).toBeGreaterThan(0);
        for (const table of tables)
            expect(table, table).toContain('role="presentation"');
    });

    test('it stays well under the size Gmail clips at', () => {
        // Gmail truncates around 102KB and shows "[Message clipped]".
        expect(html.length).toBeLessThan(40_000);
    });
});

describe('direction', () => {
    test.each([
        ['en-US', 'ltr'],
        ['es-MX', 'ltr'],
        ['ar-SA', 'rtl'],
        ['he-IL', 'rtl'],
        ['fa-AF', 'rtl'],
        [undefined, 'ltr'],
    ])('%s reads %s', (locale, expected) => {
        expect(directionOf(locale)).toBe(expected);
    });

    test('the document declares both its language and its direction', () => {
        // The old template declared neither, in an app that ships three
        // right-to-left locales.
        const { html } = renderEmail(message({ language: 'ar-SA' }));
        expect(html).toContain('lang="ar-SA"');
        expect(html).toContain('dir="rtl"');
    });
});

describe('the plain-text alternative', () => {
    test('carries every block, because some clients show only this', () => {
        const { text } = renderEmail(message());
        for (const piece of [
            'A heading',
            'A paragraph',
            'Press me',
            'A note',
            'Label',
            'Value',
        ])
            expect(text).toContain(piece);
    });

    test("and an action's URL, not just its label", () => {
        const { text } = renderEmail(message());
        expect(text).toContain('https://wordplay.dev/x');
    });
});

test('an action appears as a button and as text', () => {
    // Both are load-bearing: the button is what most people press, and the
    // visible URL is what survives image blocking, a forced dark-mode inversion
    // that recolors the label, and reading the mail on another device.
    const { html } = renderEmail(message());
    expect(html).toContain('href="https://wordplay.dev/x"');
    expect(html.match(/https:\/\/wordplay\.dev\/x/g)?.length).toBeGreaterThan(
        1,
    );
});

describe('dark mode reaches every color it needs to', () => {
    /**
     * The rule this file exists to keep: an inline color is what survives
     * Gmail, and a role class is the only way Apple Mail can repaint it —
     * because an inline color on a descendant beats a rule on its ancestor.
     * Declare one without the other and the element is stuck in light forever.
     *
     * This is one test rather than four because four separate faults shipped
     * from one cause: the wordmark was black on black, notes and field labels
     * stayed at 3.6:1 on black, and bare URLs stayed at a gold nobody could
     * read — while `.wp-dim` and `.wp-link` sat in the stylesheet, declared and
     * emitted on nothing.
     */
    const { html } = renderEmail(
        message({
            manageURL: 'https://wordplay.dev/profile',
            manageLabel: 'Change your notification settings',
        }),
    );

    /** The classes the dark block actually overrides. */
    const overridden = [
        ...(
            html.match(
                /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\n\}/,
            )?.[0] ?? ''
        ).matchAll(/\.(wp-[\w-]+)/g),
    ].map((match) => match[1]);

    test('the dark block names some classes, or this test is asleep', () => {
        expect(overridden.length).toBeGreaterThan(3);
    });

    test('every element declaring a color carries one of them', () => {
        // Tags in the body, minus the <style> block, which declares the
        // overrides themselves.
        const body = html.slice(html.indexOf('</style>'));
        const stranded = [
            // A `color:` declaration, not the `background-color:` that happens
            // to contain it — a ground is not text, and the dark block repaints
            // grounds through the same classes anyway.
            ...body.matchAll(
                /<(\w+)([^>]*\bstyle="[^"]*(?<![-\w])color:[^"]*")[^>]*>/g,
            ),
        ]
            .filter((match) => {
                const tag = match[0];
                // The button's label is literal black on gold in both schemes —
                // it is text on its own surface, not on the page.
                if (tag.includes('text-decoration:none')) return false;
                // The preheader is the line a client shows beside the subject.
                // It is painted transparent and hidden at zero size, so it has
                // no scheme to be wrong in.
                if (tag.includes('mso-hide:all')) return false;
                const classes = tag.match(/class="([^"]*)"/)?.[1] ?? '';
                return !classes
                    .split(/\s+/)
                    .some((name) => overridden.includes(name));
            })
            .map((match) => match[0].slice(0, 90));
        expect(
            stranded,
            'these declare a color the dark palette can never override',
        ).toEqual([]);
    });

    test('the wordmark is one of them', () => {
        // The one the contact sheet caught: it is a bare <span> outside every
        // block, so a rule written for blocks alone misses it.
        expect(html).toMatch(/<span class="wp-mark"[^>]*>Wordplay<\/span>/);
    });

    test('a note keeps its dimming rather than being flattened', () => {
        // A blanket `.wp-body p` override repainted notes and URLs at full
        // foreground, which is not what dimmed means.
        const dark =
            html.match(
                /@media \(prefers-color-scheme: dark\)[\s\S]*?\n\}/,
            )?.[0] ?? '';
        expect(dark).not.toMatch(/\.wp-body\s+p\b/);
        expect(dark).toContain('.wp-dim');
    });
});
