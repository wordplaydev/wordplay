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
 * The app's semantic color names (the `--wordplay-*` layer of app.html)
 * resolved to concrete hex for one mode, so the mappings below can be written
 * in the vocabulary the app uses rather than in raw hues.
 */
function getPalette(mode: Mode) {
    const p = {
        foreground: hex(`black-${mode}`),
        background: hex(`white-${mode}`),
        /** --wordplay-alternating-color: the app's secondary surface. */
        chrome: hex(`very-light-grey-${mode}`),
        border: hex(`light-grey-${mode}`),
        header: hex(`dark-grey-${mode}`),
        inactive: hex(`grey-text-${mode}`),
        link: hex(`gold-text-${mode}`),
        focus: hex(`focus-blue-${mode}`),
        blue: hex(`blue-${mode}`),
        /** --wordplay-evaluation-color: what is currently being evaluated. */
        evaluation: hex(`pink-${mode}`),
        /** --wordplay-doc-color. */
        doc: hex(`purple-${mode}`),
        /** --wordplay-relation/operator/type-color all resolve here. */
        structure: hex(`orange-text-${mode}`),
        orange: hex(`orange-${mode}`),
        highlight: hex(`yellow-${mode}`),
        highlightTransparent: hex(`yellow-transparent-${mode}`),
        error: hex(`orange-text-${mode}`),
        /** Literals and the ƒ/→ evaluation markers. */
        literal: hex(`blue-text-${mode}`),
        /**
         * The window's identity color, used on chrome that carries no app
         * meaning: title bar, cursors, badges, accent borders. Deliberately
         * the gold rather than one of the semantic hues — pink and purple
         * already mean evaluation and docs, and blue means literals and focus,
         * so an identity accent in any of those reads as a status it isn't.
         * The AA text variant, not the brighter --color-yellow, because a
         * saturated frame around every pane is exactly what this replaced.
         */
        accent: hex(`gold-text-${mode}`),
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
    const channels = (c: string) =>
        [1, 3, 5].map((offset) => parseInt(c.slice(offset, offset + 2), 16));
    const [from, to] = [channels(color), channels(background)];
    for (let step = 0; step <= 100; step++) {
        const mixed =
            '#' +
            from
                .map((channel, index) =>
                    Math.round(channel + ((to[index] - channel) * step) / 100)
                        .toString(16)
                        .padStart(2, '0'),
                )
                .join('');
        if (contrast(mixed, background) <= target) return mixed;
    }
    return background;
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
 * Workbench chrome. The identity colors — a gold title bar and a purple status
 * bar — are the two surfaces visible in every window at a glance, which is the
 * whole point of theming this repo differently from other windows.
 */
function getWorkbenchColors(p: Palette, mode: Mode): Record<string, string> {
    return {
        foreground: p.foreground,
        descriptionForeground: p.inactive,
        disabledForeground: p.inactive,
        errorForeground: p.error,
        focusBorder: p.focus,
        'widget.border': p.border,
        'selection.background': p.highlightTransparent,
        'textLink.foreground': p.link,
        'textLink.activeForeground': p.link,
        'textBlockQuote.background': p.chrome,
        'textCodeBlock.background': p.chrome,
        'textSeparator.foreground': p.border,

        // Title bar: the identity accent, the loudest window identifier.
        'titleBar.activeBackground': p.accent,
        'titleBar.activeForeground': textOn(p.accent, mode),
        'titleBar.inactiveBackground': alpha(p.accent, 0.6),
        'titleBar.inactiveForeground': alpha(textOn(p.accent, mode), 0.7),
        'titleBar.border': p.border,

        // Status bar: the app's doc purple.
        'statusBar.background': p.doc,
        'statusBar.foreground': textOn(p.doc, mode),
        'statusBar.border': p.border,
        'statusBar.noFolderBackground': p.doc,
        'statusBar.debuggingBackground': p.orange,
        'statusBar.debuggingForeground': textOn(p.orange, mode),
        'statusBarItem.remoteBackground': p.doc,
        'statusBarItem.remoteForeground': textOn(p.doc, mode),
        'statusBarItem.hoverBackground': alpha(textOn(p.doc, mode), 0.15),
        'statusBarItem.errorBackground': p.error,
        'statusBarItem.errorForeground': textOn(p.error, mode),
        'statusBarItem.warningBackground': p.highlight,
        'statusBarItem.warningForeground': textOn(p.highlight, mode),

        'activityBar.background': p.chrome,
        'activityBar.foreground': p.foreground,
        'activityBar.inactiveForeground': p.inactive,
        'activityBar.border': p.border,
        'activityBar.activeBorder': p.accentBorder,
        'activityBarBadge.background': p.accent,
        'activityBarBadge.foreground': textOn(p.accent, mode),

        'sideBar.background': p.chrome,
        'sideBar.foreground': p.foreground,
        'sideBar.border': p.border,
        'sideBarTitle.foreground': p.inactive,
        'sideBarSectionHeader.background': p.chrome,
        'sideBarSectionHeader.foreground': p.foreground,
        'sideBarSectionHeader.border': p.border,

        'editorGroup.border': p.border,
        'editorGroupHeader.tabsBackground': p.chrome,
        'editorGroupHeader.tabsBorder': p.border,
        'tab.activeBackground': p.background,
        'tab.activeForeground': p.foreground,
        'tab.activeBorderTop': p.accentBorder,
        'tab.activeBorder': p.background,
        'tab.inactiveBackground': p.chrome,
        'tab.inactiveForeground': p.inactive,
        'tab.hoverBackground': p.highlightTransparent,
        'tab.border': p.border,
        'tab.unfocusedActiveBorderTop': alpha(p.accentBorder, 0.4),

        'editor.background': p.background,
        'editor.foreground': p.foreground,
        'editorCursor.foreground': p.accent,
        'editor.selectionBackground': p.highlightTransparent,
        'editor.inactiveSelectionBackground': alpha(p.highlight, 0.15),
        'editor.selectionHighlightBackground': alpha(p.highlight, 0.15),
        'editor.wordHighlightBackground': alpha(p.blue, 0.15),
        'editor.wordHighlightStrongBackground': alpha(p.blue, 0.25),
        'editor.findMatchBackground': alpha(p.highlight, 0.5),
        'editor.findMatchHighlightBackground': alpha(p.highlight, 0.25),
        'editor.lineHighlightBackground': p.chrome,
        'editor.rangeHighlightBackground': alpha(p.highlight, 0.15),
        'editorWhitespace.foreground': alpha(p.border, 0.5),
        'editorIndentGuide.background1': alpha(p.border, 0.4),
        'editorIndentGuide.activeBackground1': p.inactive,
        'editorLineNumber.foreground': p.inactive,
        'editorLineNumber.activeForeground': p.foreground,
        'editorRuler.foreground': alpha(p.border, 0.4),
        'editorLink.activeForeground': p.link,
        'editorBracketMatch.background': p.highlightTransparent,
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
        'editorWarning.foreground': p.highlight,
        'editorInfo.foreground': p.literal,
        'editorGutter.modifiedBackground': p.literal,
        'editorGutter.addedBackground': p.link,
        'editorGutter.deletedBackground': p.error,

        'editorOverviewRuler.border': p.border,
        'editorOverviewRuler.findMatchForeground': p.highlight,
        'editorOverviewRuler.errorForeground': p.error,
        'editorOverviewRuler.warningForeground': p.highlight,
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
        'peekViewEditor.matchHighlightBackground': alpha(p.highlight, 0.4),
        'peekViewResult.background': p.chrome,
        'peekViewResult.selectionBackground': p.highlightTransparent,
        'peekViewTitle.background': p.chrome,

        'diffEditor.insertedTextBackground': alpha(p.link, 0.15),
        'diffEditor.removedTextBackground': alpha(p.error, 0.15),
        'diffEditor.border': p.border,

        'panel.background': p.background,
        'panel.border': p.border,
        'panelTitle.activeForeground': p.foreground,
        'panelTitle.inactiveForeground': p.inactive,
        'panelTitle.activeBorder': p.accentBorder,

        'terminal.background': p.background,
        'terminal.foreground': p.foreground,
        'terminal.selectionBackground': p.highlightTransparent,
        'terminalCursor.foreground': p.accent,

        'list.activeSelectionBackground': p.focus,
        'list.activeSelectionForeground': textOn(p.focus, mode),
        'list.inactiveSelectionBackground': p.chrome,
        'list.inactiveSelectionForeground': p.foreground,
        'list.hoverBackground': p.highlightTransparent,
        'list.highlightForeground': p.link,
        'list.focusOutline': p.focus,
        'list.errorForeground': p.error,
        'list.warningForeground': p.link,

        'button.background': p.focus,
        'button.foreground': textOn(p.focus, mode),
        'button.hoverBackground': p.doc,
        'button.secondaryBackground': p.chrome,
        'button.secondaryForeground': p.foreground,
        'badge.background': p.accent,
        'badge.foreground': textOn(p.accent, mode),
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
        'notificationsWarningIcon.foreground': p.highlight,
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
