/**
 * Derives a VS Code color theme from the app's own palette, so the editor
 * chrome of this repo's window looks like the app it builds.
 *
 * Nothing here is a hand-copied hex value: every color resolves to a raw
 * `--name-light` / `--name-dark` declaration in src/app.html, and every syntax
 * color mirrors a token category's color in
 * src/components/editor/tokens/TokenView.svelte. A palette edit that isn't
 * regenerated fails vscodeThemeSync.test.ts.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast } from '../../src/util/colorContrast';

const Root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const ThemeDirectory = resolve(Root, '.vscode/wordplay-theme/themes');

export type Mode = 'light' | 'dark';

export const Modes: Mode[] = ['light', 'dark'];

/** Where each mode's generated theme file lives, and what VS Code calls it. */
export const ThemeFiles: Record<Mode, { path: string; label: string }> = {
    light: {
        path: resolve(ThemeDirectory, 'wordplay-light-color-theme.json'),
        label: 'Wordplay Light',
    },
    dark: {
        path: resolve(ThemeDirectory, 'wordplay-dark-color-theme.json'),
        label: 'Wordplay Dark',
    },
};

const appHTML = readFileSync(resolve(Root, 'src/app.html'), 'utf-8');

/**
 * Read a raw `--name: #hex;` palette declaration out of app.html. Accepts the
 * 8-digit form too, since the transparent highlight pairs are authored with
 * their alpha baked in.
 */
function hex(name: string): string {
    const match = appHTML.match(
        new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6})\\s*;`),
    );
    if (match === null)
        throw new Error(
            `No hex declaration for --${name} in app.html; the palette moved or was renamed.`,
        );
    return match[1].toLowerCase();
}

/** WCAG 2.2 AA minimum contrast for normal-size text. */
const AA_TEXT = 4.5;

/**
 * What text on a badge or a status-bar pill has to reach. VS Code draws those
 * at 9-11px, and AA's 4.5:1 is calibrated for ~16px, so the gold notification
 * circle that technically passed AA at 5.87:1 was still the least legible
 * thing in the window. AAA's 7:1 is the bar small text actually has.
 */
const SMALL_TEXT = 7;

/**
 * The app's semantic color names (the `--wordplay-*` layer of app.html)
 * resolved to concrete hex for one mode, so the mappings below can be written
 * in the vocabulary the app uses rather than in raw hues.
 */
function getPalette(mode: Mode) {
    const foreground = hex(`black-${mode}`);
    const background = hex(`white-${mode}`);
    const chrome = hex(`very-light-grey-${mode}`);

    /**
     * The two surfaces text lands on: a pane, and the alternating chrome that
     * floating widgets (hovers, suggestions, menus, peek results) use. Checking
     * only the pane is how the doc purple shipped at 4.06:1 — it clears AA on
     * white and misses it on the widget grey a hover draws behind it.
     */
    const surfaces = [background, chrome];

    /**
     * The palette's own AA text variants, which paletteContrast.test.ts already
     * holds at 4.5:1 on both surfaces. They're what a tint has to stay legible
     * behind, and nothing here derives them, which is what keeps `tint` below
     * from depending on the colors it constrains.
     */
    const settled = [
        foreground,
        hex(`dark-grey-${mode}`),
        hex(`grey-text-${mode}`),
        hex(`gold-text-${mode}`),
        hex(`blue-text-${mode}`),
        hex(`orange-text-${mode}`),
    ];

    /**
     * A translucent highlight, weakened from the strength the caller asks for
     * until the text it covers stays readable on a pane. Bounding it by the
     * pane rather than by both surfaces is deliberate: the palette's AA
     * variants sit at 4.66-5.09:1 on the widget chrome, almost exactly their
     * floor, so a chrome-bounded tint collapses to 6% alpha — a selection you
     * cannot see, which is its own failure. The chrome case is answered from
     * the other side instead, by `readable` below.
     */
    const tint = (color: string, ceiling: number) =>
        weaken(color, ceiling, [background], settled, AA_TEXT);

    /** Selections, hovers, and find matches: the app's gold, as strong as it can be. */
    const highlightTint = tint(
        hex(`yellow-${mode}`),
        alphaOf(hex(`yellow-transparent-${mode}`)),
    );

    /** The same gold for secondary highlights, which have to stay the quieter pair. */
    const softTint = alpha(hex(`yellow-${mode}`), alphaOf(highlightTint) / 2);

    /** Every surface a color can be drawn as text on, selection included. */
    const tinted = surfaces.flatMap((surface) => [
        surface,
        over(highlightTint, surface),
    ]);

    /**
     * Deepen a hue until it clears AA everywhere the theme can draw it as text
     * — including under a selection, and including on the widget chrome, where
     * the palette's variants have only tenths of a point to spare.
     */
    const readable = (color: string) =>
        tinted.reduce(
            (deepened, surface) =>
                deepen(deepened, foreground, surface, AA_TEXT),
            color,
        );

    /**
     * A badge or a status-bar pill, deepened until the label it carries reaches
     * SMALL_TEXT. These are the gold notification circles: they cleared AA and
     * were still the hardest thing in the window to read, because AA's number
     * assumes text roughly twice the size VS Code draws them at.
     */
    const pill = (color: string) =>
        deepen(color, foreground, background, SMALL_TEXT);

    const p = {
        foreground,
        background,
        /** --wordplay-alternating-color: the app's secondary surface. */
        chrome,
        border: hex(`light-grey-${mode}`),
        header: readable(hex(`dark-grey-${mode}`)),
        inactive: readable(hex(`grey-text-${mode}`)),
        link: readable(hex(`gold-text-${mode}`)),
        focus: hex(`focus-blue-${mode}`),
        blue: hex(`blue-${mode}`),
        /** --wordplay-evaluation-color: what is currently being evaluated. */
        evaluation: readable(hex(`pink-${mode}`)),
        /** --wordplay-doc-color. */
        doc: readable(hex(`purple-${mode}`)),
        /** The same hue as a fill, where the contrast that matters is its label's. */
        docFill: hex(`purple-${mode}`),
        /** --wordplay-relation/operator/type-color all resolve here. */
        structure: readable(hex(`orange-text-${mode}`)),
        orange: hex(`orange-${mode}`),
        highlight: hex(`yellow-${mode}`),
        highlightTint,
        softTint,
        /**
         * Gold drawn as a glyph — a warning squiggle, a notification icon, an
         * overview-ruler mark. The raw --color-yellow is a background hue and
         * measures 3.01:1 on white and 2.71:1 on the notification chrome, so
         * anything shaped like text or an icon takes the AA variant instead,
         * which is the app's own rule for the split.
         */
        warning: readable(hex(`gold-text-${mode}`)),
        error: readable(hex(`orange-text-${mode}`)),
        /** Literals and the ƒ/→ evaluation markers. */
        literal: readable(hex(`blue-text-${mode}`)),
        /**
         * The color that marks what's active, the way the app's tile toolbars
         * fill their active toggle: cursors, badges, the active tab's rule, the
         * active activity-bar marker. Deliberately the gold rather than one of
         * the semantic hues — pink and purple already mean evaluation and docs,
         * and blue means literals and focus, so an accent in any of those reads
         * as a status it isn't. The AA text variant, not the brighter
         * --color-yellow, since these are hairlines and small fills.
         */
        accent: hex(`gold-text-${mode}`),
        tint,
        pill,
    };
    return {
        ...p,
        /**
         * The accent as a hairline rather than a fill. The palette tunes its
         * colors to stay legible as *text*, which is more contrast than WCAG
         * 1.4.11 asks of a non-text UI part (3:1), and reads as glaring on a
         * 1px rule. Accent borders are toned back toward the background until
         * they sit at the contrast the palette targets for text.
         */
        accentBorder: subdue(p.accent, p.background, AA_TEXT),
        /** Badges and status-bar pills: the accent, deepened for 9px text. */
        badge: pill(p.accent),
    };
}

type Palette = ReturnType<typeof getPalette>;

/**
 * Pick the text color for a brand-colored surface the way the app does:
 * --wordplay-error-text-color puts --color-white on the error fill, so the
 * mode's background color is the default, and only when that misses AA does it
 * flip to the foreground (which is how the focus blue carries white text in
 * dark mode). Throws if neither reaches AA, since the palette then has no
 * legible answer for that surface.
 */
function textOn(background: string, mode: Mode): string {
    const preferred = hex(`white-${mode}`);
    if (contrast(preferred, background) >= AA_TEXT) return preferred;
    const fallback = hex(`black-${mode}`);
    if (contrast(fallback, background) >= AA_TEXT) return fallback;
    throw new Error(
        `Neither ${preferred} nor ${fallback} reaches ${AA_TEXT}:1 on ${background} in ${mode} mode; that surface needs a different palette color.`,
    );
}

/**
 * Blend toward a background until a color stops exceeding a contrast target,
 * the way the app tones its block fills (`color-mix(in srgb, …)` in app.html).
 * Returns the color untouched if it's already at or below the target.
 */
function subdue(color: string, background: string, target: number): string {
    for (let step = 0; step <= 100; step++) {
        const mixed = blend(color, background, step / 100);
        if (contrast(mixed, background) <= target) return mixed;
    }
    return background;
}

/**
 * Blend toward `toward` until a color *clears* a contrast target against
 * `surface` — the mirror of subdue(), which blends until a color falls below
 * one. `toward` is the end of the palette away from whatever has to stay
 * legible: the mode's foreground when deepening text or a fill under a
 * background-colored label, and the background when the label is the
 * foreground. Returns `toward` if even that misses.
 */
function deepen(
    color: string,
    toward: string,
    surface: string,
    target: number,
): string {
    for (let step = 0; step <= 100; step++) {
        const mixed = blend(color, toward, step / 100);
        if (contrast(mixed, surface) >= target) return mixed;
    }
    return toward;
}

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

/** Composite a translucent color over an opaque one. */
function over(color: string, background: string): string {
    return color.length === 7
        ? color
        : blend(
              background,
              color.slice(0, 7),
              parseInt(color.slice(7, 9), 16) / 255,
          );
}

/**
 * The strongest translucent version of a highlight that every color drawn as
 * text on top of it still clears `target` against. A highlight is a background
 * for whatever it covers, so its strength is bounded by the dimmest thing that
 * can sit under it — the app's gold hover is authored at 29%, which is fine
 * behind full-strength foreground text and not fine behind a dimmed tab label
 * (4.43:1) or a gold list match (4.17:1). `ceiling` is where the search starts,
 * so a tint is only ever weakened from what it was, never strengthened.
 */
function weaken(
    color: string,
    ceiling: number,
    surfaces: string[],
    texts: string[],
    target: number,
): string {
    for (let step = Math.round(ceiling * 255); step >= 0; step--) {
        const tint = alpha(color, step / 255);
        if (
            surfaces.every((surface) =>
                texts.every(
                    (text) => contrast(text, over(tint, surface)) >= target,
                ),
            )
        )
            return tint;
    }
    return alpha(color, 0);
}

/** The alpha of an 8-digit palette hex, as a fraction. */
function alphaOf(color: string): number {
    return parseInt(color.slice(7, 9), 16) / 255;
}

/**
 * A filled control's hover state: the same hue, moved away from the label it
 * carries until that label reaches SMALL_TEXT. Deriving the shift from the
 * label rather than from a fixed blend is what guarantees the hover is both
 * visible against the resting fill and never less legible than it.
 */
function hovered(
    fill: string,
    p: { foreground: string; background: string },
    mode: Mode,
): string {
    const label = textOn(fill, mode);
    const away = label === p.foreground ? p.background : p.foreground;
    return deepen(fill, away, label, SMALL_TEXT);
}

/** Append an alpha byte to a 6-digit palette hex. */
function alpha(color: string, opacity: number): string {
    return (
        color +
        Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0')
    );
}

/**
 * Workbench chrome, laid out like the app's project view: every pane is the
 * same --wordplay-background (white in light mode, black in dark), and the only
 * thing separating them is a 1px --wordplay-border-color rule, the way tiles are
 * separated in ProjectView. So every surface here is `p.background` and every
 * seam is `p.border`; `p.chrome` is left for things that float above a pane
 * (menus, hovers, suggestions) or that alternate within one, which is what the
 * app's --wordplay-alternating-color means.
 *
 * The window's identity comes from that composition rather than from a colored
 * bar — an editor that looks like the app it builds. The gold accent survives
 * only where the app uses it: on what's currently active.
 */
function getWorkbenchColors(p: Palette, mode: Mode): Record<string, string> {
    return {
        foreground: p.foreground,
        descriptionForeground: p.inactive,
        disabledForeground: p.inactive,
        errorForeground: p.error,
        focusBorder: p.focus,
        'widget.border': p.border,
        'selection.background': p.highlightTint,
        'textLink.foreground': p.link,
        'textLink.activeForeground': p.link,
        'textBlockQuote.background': p.chrome,
        'textCodeBlock.background': p.chrome,
        'textSeparator.foreground': p.border,

        // Title bar and status bar are panes like any other: the app has no
        // colored frame, and a saturated bar top and bottom is what this
        // replaced. Only a genuine status (debugging, a remote) fills them.
        'titleBar.activeBackground': p.background,
        'titleBar.activeForeground': p.foreground,
        'titleBar.inactiveBackground': p.background,
        'titleBar.inactiveForeground': p.inactive,
        'titleBar.border': p.border,

        'statusBar.background': p.background,
        'statusBar.foreground': p.foreground,
        'statusBar.border': p.border,
        'statusBar.noFolderBackground': p.background,
        'statusBar.debuggingBackground': p.orange,
        'statusBar.debuggingForeground': textOn(p.orange, mode),
        'statusBarItem.remoteBackground': p.pill(p.docFill),
        'statusBarItem.remoteForeground': textOn(p.pill(p.docFill), mode),
        'statusBarItem.hoverBackground': p.highlightTint,
        'statusBarItem.errorBackground': p.pill(p.error),
        'statusBarItem.errorForeground': textOn(p.pill(p.error), mode),
        'statusBarItem.warningBackground': p.pill(p.highlight),
        'statusBarItem.warningForeground': textOn(p.pill(p.highlight), mode),

        'activityBar.background': p.background,
        'activityBar.foreground': p.foreground,
        'activityBar.inactiveForeground': p.inactive,
        'activityBar.border': p.border,
        'activityBar.activeBorder': p.accentBorder,
        'activityBarBadge.background': p.badge,
        'activityBarBadge.foreground': textOn(p.badge, mode),

        'sideBar.background': p.background,
        'sideBar.foreground': p.foreground,
        'sideBar.border': p.border,
        'sideBarTitle.foreground': p.inactive,
        'sideBarSectionHeader.background': p.background,
        'sideBarSectionHeader.foreground': p.foreground,
        'sideBarSectionHeader.border': p.border,

        // Tabs are all one surface, separated by the same rule as the panes and
        // told apart by the accent on the active one — the way the app's tile
        // toolbars fill only the active toggle.
        'editorGroup.border': p.border,
        'editorGroupHeader.tabsBackground': p.background,
        'editorGroupHeader.tabsBorder': p.border,
        'tab.activeBackground': p.background,
        'tab.activeForeground': p.foreground,
        'tab.activeBorderTop': p.accentBorder,
        'tab.activeBorder': p.background,
        'tab.inactiveBackground': p.background,
        'tab.inactiveForeground': p.inactive,
        'tab.hoverBackground': p.highlightTint,
        'tab.border': p.border,
        'tab.unfocusedActiveBorderTop': alpha(p.accentBorder, 0.4),

        'editor.background': p.background,
        'editor.foreground': p.foreground,
        'editorCursor.foreground': p.accent,
        'editor.selectionBackground': p.highlightTint,
        'editor.inactiveSelectionBackground': p.softTint,
        'editor.selectionHighlightBackground': p.softTint,
        'editor.wordHighlightBackground': p.tint(p.blue, 0.15),
        'editor.wordHighlightStrongBackground': p.tint(p.blue, 0.25),
        'editor.findMatchBackground': p.highlightTint,
        'editor.findMatchHighlightBackground': p.softTint,
        'editor.lineHighlightBackground': p.chrome,
        'editor.rangeHighlightBackground': p.softTint,
        'editorWhitespace.foreground': alpha(p.border, 0.5),
        'editorIndentGuide.background1': alpha(p.border, 0.4),
        'editorIndentGuide.activeBackground1': p.inactive,
        'editorLineNumber.foreground': p.inactive,
        'editorLineNumber.activeForeground': p.foreground,
        'editorRuler.foreground': alpha(p.border, 0.4),
        'editorLink.activeForeground': p.link,
        'editorBracketMatch.background': p.highlightTint,
        'editorBracketMatch.border': p.highlight,

        // Nesting depth in the Wordplay editor alternates the foreground and
        // the type/operator orange (TokenView.svelte's .bracket-depth-*), which
        // is exactly what bracket pair colorization wants.
        'editorBracketHighlight.foreground1': p.foreground,
        'editorBracketHighlight.foreground2': p.structure,
        'editorBracketHighlight.foreground3': p.foreground,
        'editorBracketHighlight.foreground4': p.structure,
        'editorBracketHighlight.foreground5': p.foreground,
        'editorBracketHighlight.foreground6': p.structure,
        'editorBracketHighlight.unexpectedBracket.foreground': p.evaluation,

        'editorError.foreground': p.error,
        'editorWarning.foreground': p.warning,
        'editorInfo.foreground': p.literal,
        'editorGutter.modifiedBackground': p.literal,
        'editorGutter.addedBackground': p.link,
        'editorGutter.deletedBackground': p.error,

        'editorOverviewRuler.border': p.border,
        'editorOverviewRuler.findMatchForeground': p.warning,
        'editorOverviewRuler.errorForeground': p.error,
        'editorOverviewRuler.warningForeground': p.warning,
        'editorOverviewRuler.modifiedForeground': p.literal,
        'editorOverviewRuler.addedForeground': p.link,
        'editorOverviewRuler.deletedForeground': p.error,

        'editorWidget.background': p.chrome,
        'editorWidget.border': p.border,
        'editorHoverWidget.background': p.chrome,
        'editorHoverWidget.border': p.border,
        'editorSuggestWidget.background': p.chrome,
        'editorSuggestWidget.border': p.border,
        'editorSuggestWidget.selectedBackground': p.focus,
        'editorSuggestWidget.selectedForeground': textOn(p.focus, mode),
        'editorSuggestWidget.highlightForeground': p.link,

        'peekView.border': p.accentBorder,
        'peekViewEditor.background': p.background,
        'peekViewEditor.matchHighlightBackground': p.highlightTint,
        'peekViewResult.background': p.chrome,
        'peekViewResult.selectionBackground': p.highlightTint,
        'peekViewTitle.background': p.chrome,

        'diffEditor.insertedTextBackground': p.tint(p.link, 0.15),
        'diffEditor.removedTextBackground': p.tint(p.error, 0.15),
        'diffEditor.border': p.border,

        'panel.background': p.background,
        'panel.border': p.border,
        'panelTitle.activeForeground': p.foreground,
        'panelTitle.inactiveForeground': p.inactive,
        'panelTitle.activeBorder': p.accentBorder,
        'panelSection.border': p.border,
        'panelSectionHeader.background': p.background,
        'panelSectionHeader.border': p.border,

        'terminal.background': p.background,
        'terminal.foreground': p.foreground,
        'terminal.border': p.border,
        'terminal.selectionBackground': p.highlightTint,
        'terminalCursor.foreground': p.accent,

        // The draggable seams between panes. The app's tile separators are
        // draggable too, and show the accent while you're on them.
        'sash.hoverBorder': p.accentBorder,
        'tree.indentGuidesStroke': alpha(p.border, 0.4),

        'list.activeSelectionBackground': p.focus,
        'list.activeSelectionForeground': textOn(p.focus, mode),
        'list.inactiveSelectionBackground': p.chrome,
        'list.inactiveSelectionForeground': p.foreground,
        'list.hoverBackground': p.highlightTint,
        'list.highlightForeground': p.link,
        'list.focusOutline': p.focus,
        'list.errorForeground': p.error,
        'list.warningForeground': p.link,

        'button.background': p.focus,
        'button.foreground': textOn(p.focus, mode),
        // Hover moves the button's own hue rather than switching to the doc
        // purple: the label color is picked for the focus blue, and on the
        // purple it measured 1.84:1 in dark mode — a hover that erased its own
        // button. Moving away from the label both raises its contrast and is
        // what makes the hover visible at all.
        'button.hoverBackground': hovered(p.focus, p, mode),
        'button.secondaryBackground': p.chrome,
        'button.secondaryForeground': p.foreground,
        'badge.background': p.badge,
        'badge.foreground': textOn(p.badge, mode),
        'progressBar.background': p.accent,

        'input.background': p.background,
        'input.foreground': p.foreground,
        'input.border': p.border,
        'input.placeholderForeground': p.inactive,
        'inputOption.activeBorder': p.focus,
        'inputValidation.errorBackground': p.background,
        'inputValidation.errorBorder': p.error,
        'inputValidation.warningBackground': p.background,
        'inputValidation.warningBorder': p.highlight,
        'dropdown.background': p.background,
        'dropdown.foreground': p.foreground,
        'dropdown.border': p.border,

        'quickInput.background': p.chrome,
        'quickInputList.focusBackground': p.focus,
        'quickInputList.focusForeground': textOn(p.focus, mode),
        'menu.background': p.chrome,
        'menu.foreground': p.foreground,
        'menu.border': p.border,
        'menu.selectionBackground': p.focus,
        'menu.selectionForeground': textOn(p.focus, mode),

        'scrollbarSlider.background': alpha(p.border, 0.4),
        'scrollbarSlider.hoverBackground': alpha(p.border, 0.6),
        'scrollbarSlider.activeBackground': alpha(p.inactive, 0.8),

        'notificationCenterHeader.background': p.chrome,
        'notifications.background': p.chrome,
        'notifications.border': p.border,
        'notificationsErrorIcon.foreground': p.error,
        'notificationsWarningIcon.foreground': p.warning,
        'notificationsInfoIcon.foreground': p.literal,

        // The palette is deliberately colorblind-safe and has no green, so
        // "added" borrows the gold link color rather than inventing a hue.
        'gitDecoration.addedResourceForeground': p.link,
        'gitDecoration.untrackedResourceForeground': p.link,
        'gitDecoration.modifiedResourceForeground': p.literal,
        'gitDecoration.deletedResourceForeground': p.error,
        'gitDecoration.ignoredResourceForeground': p.inactive,
        'gitDecoration.conflictingResourceForeground': p.evaluation,

        'breadcrumb.foreground': p.inactive,
        'breadcrumb.focusForeground': p.foreground,
        'breadcrumb.background': p.background,

        'minimap.findMatchHighlight': p.highlight,
        'minimap.selectionHighlight': p.highlight,
        'minimapSlider.background': alpha(p.border, 0.3),

        'settings.headerForeground': p.foreground,
        'settings.modifiedItemIndicator': p.accentBorder,
        'keybindingLabel.background': p.chrome,
        'keybindingLabel.foreground': p.foreground,
        'keybindingLabel.border': p.border,
    };
}

type TokenColor = {
    name: string;
    scope: string[];
    settings: { foreground?: string; fontStyle?: string };
};

/**
 * Syntax colors, mapped category by category from the Wordplay editor's own
 * token colors in TokenView.svelte:
 *
 *   docs        → purple      operator/relation/type → orange text
 *   delimiter   → dark grey   eval (the ƒ and → markers) → blue text
 *   literal     → blue text   name → foreground
 *   unknown     → pink        placeholder → grey text
 *
 * The one place this reads Wordplay's categories rather than copying them
 * literally: Wordplay colors `ƒ` blue and a function's *name* foreground, so
 * `function`/`=>` are blue here while the name they introduce is not. Coloring
 * whole call expressions blue would have made function names and strings
 * indistinguishable.
 */
function getTokenColors(p: Palette): TokenColor[] {
    return [
        {
            name: 'Docs',
            scope: [
                'comment',
                'punctuation.definition.comment',
                'string.comment',
            ],
            // The app shrinks doc tokens to 0.85em; VS Code has no per-scope
            // font size, so italic carries the "different register" signal.
            settings: { foreground: p.doc, fontStyle: 'italic' },
        },
        {
            name: 'Doc references',
            scope: [
                'storage.type.class.jsdoc',
                'entity.name.type.instance.jsdoc',
                'variable.other.jsdoc',
                'comment.block.documentation keyword',
            ],
            settings: { foreground: p.link, fontStyle: 'italic' },
        },
        {
            name: 'Delimiters',
            scope: [
                'punctuation',
                'meta.brace',
                'punctuation.definition.block',
                'punctuation.definition.parameters',
                'punctuation.separator.comma',
                'punctuation.terminator',
                'punctuation.definition.tag',
            ],
            settings: { foreground: p.header },
        },
        {
            name: 'Relations',
            scope: [
                'punctuation.accessor',
                'punctuation.separator.key-value',
                'punctuation.separator.label',
                'keyword.operator.type.annotation',
                'meta.object-literal.key punctuation.separator',
            ],
            settings: { foreground: p.structure },
        },
        {
            name: 'Operators and keywords',
            scope: [
                'keyword',
                'keyword.control',
                'keyword.operator',
                'storage',
                'storage.modifier',
                'storage.type',
                'variable.language.super',
                'keyword.other',
            ],
            settings: { foreground: p.structure },
        },
        {
            name: 'Evaluation markers',
            scope: [
                'storage.type.function',
                'storage.type.function.arrow',
                'keyword.operator.arrow',
                'keyword.control.new',
                'keyword.operator.new',
            ],
            settings: { foreground: p.literal },
        },
        {
            name: 'Types',
            scope: [
                'entity.name.type',
                'entity.name.class',
                'entity.other.inherited-class',
                'support.type',
                'support.class',
                'meta.type.annotation entity.name',
                'entity.name.tag',
                'entity.name.namespace',
            ],
            settings: { foreground: p.structure },
        },
        {
            name: 'Literals',
            scope: [
                'string',
                'string.quoted',
                'string.template',
                'punctuation.definition.string',
                'constant.numeric',
                'constant.language',
                'constant.character',
                'constant.other',
                'string.regexp',
                'variable.language.this',
                'support.constant',
            ],
            settings: { foreground: p.literal },
        },
        {
            name: 'Names',
            scope: [
                'variable',
                'variable.other',
                'variable.parameter',
                'entity.name.function',
                'support.function',
                'meta.definition.variable',
                'meta.object-literal.key',
                'support.type.property-name',
                'entity.other.attribute-name',
                'meta.property-name',
            ],
            settings: { foreground: p.foreground },
        },
        {
            name: 'Evaluated definitions',
            scope: ['meta.decorator', 'entity.name.function.decorator'],
            settings: { foreground: p.evaluation },
        },
        {
            name: 'Placeholders',
            scope: [
                'comment.block.documentation storage.type.placeholder',
                // Wordplay's `_`. The descendant selector above can never match
                // one at the top level, and without this it falls to the
                // `variable` rule below and renders as a name.
                'variable.language.placeholder.wordplay',
            ],
            settings: { foreground: p.inactive },
        },
        {
            name: 'Unknown',
            scope: ['invalid', 'invalid.illegal'],
            settings: { foreground: p.evaluation },
        },
        {
            name: 'Deprecated',
            scope: ['invalid.deprecated'],
            settings: { foreground: p.inactive, fontStyle: 'strikethrough' },
        },
        {
            name: 'Markup headings',
            scope: ['markup.heading', 'entity.name.section'],
            settings: { foreground: p.doc, fontStyle: 'bold' },
        },
        {
            name: 'Markup emphasis',
            scope: ['markup.bold'],
            settings: { fontStyle: 'bold' },
        },
        {
            name: 'Markup italics',
            scope: ['markup.italic'],
            settings: { fontStyle: 'italic' },
        },
        {
            name: 'Markup code',
            scope: ['markup.inline.raw', 'markup.fenced_code'],
            settings: { foreground: p.literal },
        },
        {
            // Wordplay markup's `_underline_`. Links are more specific, so they
            // keep their own color below.
            name: 'Markup underline',
            scope: ['markup.underline'],
            settings: { fontStyle: 'underline' },
        },
        {
            name: 'Markup links',
            scope: ['markup.underline.link', 'string.other.link'],
            settings: { foreground: p.link, fontStyle: 'underline' },
        },
        {
            name: 'Markup diffs',
            scope: ['markup.inserted'],
            settings: { foreground: p.link },
        },
        {
            name: 'Markup deletions',
            scope: ['markup.deleted'],
            settings: { foreground: p.error },
        },
    ];
}

/**
 * Semantic highlighting reclassifies some of the scopes above (TypeScript
 * marks a `class` as a type rather than by its declaring keyword), so the same
 * category mapping is restated here to keep the two passes agreeing.
 */
function getSemanticTokenColors(p: Palette): Record<string, string> {
    return {
        type: p.structure,
        class: p.structure,
        interface: p.structure,
        enum: p.structure,
        typeParameter: p.structure,
        namespace: p.structure,
        keyword: p.structure,
        function: p.foreground,
        method: p.foreground,
        variable: p.foreground,
        parameter: p.foreground,
        property: p.foreground,
        enumMember: p.literal,
        string: p.literal,
        number: p.literal,
    };
}

/** Build one mode's complete VS Code theme document. */
export function buildTheme(mode: Mode) {
    const p = getPalette(mode);
    return {
        $schema: 'vscode://schemas/color-theme',
        name: ThemeFiles[mode].label,
        type: mode,
        semanticHighlighting: true,
        colors: getWorkbenchColors(p, mode),
        semanticTokenColors: getSemanticTokenColors(p),
        tokenColors: getTokenColors(p),
    };
}

/** The exact bytes each generated theme file should contain. */
export function serializeTheme(mode: Mode): string {
    return `${JSON.stringify(buildTheme(mode), null, 4)}\n`;
}
