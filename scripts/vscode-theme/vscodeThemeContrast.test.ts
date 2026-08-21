import { describe, expect, test } from 'vitest';
import { contrast } from '../../src/util/colorContrast';
import { buildTheme, Modes, type Mode } from './theme';

/**
 * Guards the WCAG 2.2 contrast invariants of the generated VS Code theme, the
 * way paletteContrast.test.ts guards the app's own palette. The theme derives
 * from that palette but recombines it — text lands on the widget chrome and
 * under a selection tint, and badges are drawn at a size AA's number doesn't
 * cover — so passing there does not imply passing here. Every one of the
 * failures below was found by measuring the shipped files, not by reading them:
 *
 *   - the gold notification circles carried 5.87:1 labels at ~9px,
 *   - the doc purple measured 4.06:1 on the hover/suggest chrome,
 *   - the warning icon measured 2.71:1, under even the non-text floor,
 *   - a dark-mode button's label fell to 1.84:1 on hover.
 */

/** WCAG 2.2 AA minimum contrast for normal-size text. */
const AA_TEXT = 4.5;

/** WCAG 2.2 AA (1.4.11) minimum contrast for meaningful non-text UI parts. */
const NON_TEXT = 3.0;

/**
 * What a badge or a status-bar pill has to reach. VS Code draws those at
 * 9-11px and AA's 4.5:1 assumes roughly twice that, so AA is not the bar they
 * actually have; see SMALL_TEXT in theme.ts.
 */
const SMALL_TEXT = 7;

/** Mix two 6-digit hexes, `amount` of the way from the first to the second. */
function blend(from: string, to: string, amount: number): string {
    const channels = (c: string) =>
        [1, 3, 5].map((offset) => parseInt(c.slice(offset, offset + 2), 16));
    const [a, b] = [channels(from), channels(to)];
    return (
        '#' +
        a
            .map((channel, index) =>
                Math.round(channel + (b[index] - channel) * amount)
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('')
    );
}

/** Composite a possibly-translucent theme color over an opaque surface. */
function over(color: string, surface: string): string {
    return color.length === 7
        ? color
        : blend(
              surface,
              color.slice(0, 7),
              parseInt(color.slice(7, 9), 16) / 255,
          );
}

/**
 * Foregrounds that draw a pure decoration — the guides and rules that exist to
 * be seen only when looked for, and that convey nothing a reader would miss.
 * WCAG excludes these, so they carry no minimum; they're listed by name so a
 * new low-contrast color has to be argued for here rather than just added.
 */
const DECORATIVE = new Set([
    'textSeparator.foreground',
    'editorWhitespace.foreground',
    'editorRuler.foreground',
    'tree.indentGuidesStroke',
]);

/**
 * Foregrounds that draw a meaningful graphic rather than text: squiggles,
 * overview-ruler marks, minimap bands, and notification icons. 1.4.11's 3:1
 * applies to these, not 1.4.3's 4.5:1.
 */
const GRAPHIC =
    /^(editorError|editorWarning|editorInfo|editorOverviewRuler|notifications.*Icon|editorCursor|terminalCursor)/;

/** Badges and status-bar pills, whose labels are drawn at 9-11px. */
const PILL = /^(badge|activityBarBadge|statusBarItem\.(error|warning|remote))/;

/**
 * Widgets that float above a pane paint themselves in the alternating chrome,
 * so their text sits on that rather than on the pane. Getting this wrong in
 * only one direction is how the doc purple shipped under AA: it clears 4.5:1
 * on white and misses it on the grey a hover draws behind it.
 */
const ON_CHROME =
    /^(editorWidget|editorHoverWidget|editorSuggestWidget|quickInput|menu|notification|peekViewResult|peekViewTitle|keybindingLabel|textBlockQuote|textCodeBlock)/;

describe.each(Modes)('%s theme', (mode: Mode) => {
    const theme = buildTheme(mode);
    const colors: Record<string, string> = theme.colors;
    const pane = colors['editor.background'];
    const chrome = colors['editorWidget.background'];

    /** The opaque surface a given color key is painted on. */
    function surfaceFor(key: string): string {
        const base = key.replace(/[Ff]oreground$/, '');
        const own = Object.keys(colors).find(
            (other) =>
                other.toLowerCase() === (base + 'background').toLowerCase(),
        );
        const under = ON_CHROME.test(key) ? chrome : pane;
        return own === undefined ? under : over(colors[own], under);
    }

    const foregrounds = Object.keys(colors).filter(
        (key) => /oreground$/.test(key) || key === 'tree.indentGuidesStroke',
    );

    test.each(foregrounds.filter((key) => !DECORATIVE.has(key)))(
        '%s is legible on what it is painted on',
        (key) => {
            const surface = surfaceFor(key);
            const minimum = PILL.test(key)
                ? SMALL_TEXT
                : GRAPHIC.test(key)
                  ? NON_TEXT
                  : AA_TEXT;
            expect(
                contrast(over(colors[key], surface), surface),
                `${key} ${colors[key]} on ${surface}`,
            ).toBeGreaterThanOrEqual(minimum);
        },
    );

    /**
     * The translucent highlights, each with the surfaces it can cover. A
     * highlight is a background for whatever it lands on, so every color the
     * theme can draw as text has to survive it — which is what bounds their
     * strength in theme.ts, and what the 4.17-4.43:1 hover labels missed.
     */
    const tints: [string, string[]][] = [
        ['selection.background', [pane, chrome]],
        ['editor.selectionBackground', [pane]],
        ['editor.inactiveSelectionBackground', [pane]],
        ['editor.selectionHighlightBackground', [pane]],
        ['editor.wordHighlightBackground', [pane]],
        ['editor.wordHighlightStrongBackground', [pane]],
        ['editor.findMatchBackground', [pane]],
        ['editor.findMatchHighlightBackground', [pane]],
        ['editor.rangeHighlightBackground', [pane]],
        ['editor.lineHighlightBackground', [pane]],
        ['diffEditor.insertedTextBackground', [pane]],
        ['diffEditor.removedTextBackground', [pane]],
        ['peekViewEditor.matchHighlightBackground', [pane]],
        ['peekViewResult.selectionBackground', [chrome]],
        ['list.hoverBackground', [pane, chrome]],
        ['tab.hoverBackground', [pane]],
        ['statusBarItem.hoverBackground', [pane]],
        ['terminal.selectionBackground', [pane]],
        ['editorBracketMatch.background', [pane]],
    ];

    /** Every color the theme draws as text, from the theme itself. */
    const textColors = [
        ...Object.values(theme.semanticTokenColors),
        ...theme.tokenColors.flatMap((token) =>
            token.settings.foreground === undefined
                ? []
                : [token.settings.foreground],
        ),
        colors['foreground'],
        colors['descriptionForeground'],
        colors['textLink.foreground'],
        colors['errorForeground'],
        colors['list.warningForeground'],
    ];

    test.each(tints)('text stays legible on %s', (key, surfaces) => {
        for (const surface of surfaces) {
            const highlighted = over(colors[key], surface);
            for (const text of new Set(textColors))
                expect(
                    contrast(text, highlighted),
                    `${text} on ${key} over ${surface} (${highlighted})`,
                ).toBeGreaterThanOrEqual(AA_TEXT);
        }
    });

    test('a filled control keeps its label on hover', () => {
        // The hover swaps the fill while the label stays put, so the label has
        // to be checked against both. Dark mode shipped a 1.84:1 hover.
        for (const [fill, label] of [
            ['button.hoverBackground', 'button.foreground'],
            ['list.hoverBackground', 'foreground'],
        ])
            expect(
                contrast(colors[label], over(colors[fill], pane)),
                `${label} on ${fill}`,
            ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    test('syntax colors are legible on panes, widgets, and selections', () => {
        const surfaces = [pane, chrome].flatMap((surface) => [
            surface,
            over(colors['selection.background'], surface),
        ]);
        for (const text of new Set(textColors))
            for (const surface of surfaces)
                expect(
                    contrast(text, surface),
                    `${text} on ${surface}`,
                ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    test('the focus indicator is discernible on every surface it rings', () => {
        for (const surface of [pane, chrome])
            expect(
                contrast(colors['focusBorder'], surface),
                `focusBorder on ${surface}`,
            ).toBeGreaterThanOrEqual(NON_TEXT);
    });
});
