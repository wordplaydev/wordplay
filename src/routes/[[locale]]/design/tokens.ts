/**
 * The spacing and size tokens the design reference documents.
 *
 * A module rather than a `const` inside `+page.svelte` so `designTokenSync.test.ts`
 * can import it without mounting a Svelte component — the same move `theme.ts`
 * made for the email palette, and for the same reason: this table is a mirror of
 * `src/app.html`, and an unchecked mirror drifts. It had: it claimed
 * `--wordplay-spacing` was `0.5em` when app.html has always said `0.5rem`.
 *
 * `cssValue` is a CSS literal, not prose, so nothing here is translated.
 */
export type SpacingVariable = {
    /** The custom property's name, as declared in app.html. */
    name: string;
    /** Its declared value, which the sync test holds against app.html. */
    cssValue: string;
    /** Whether the page can resolve it to pixels and draw a square of it.
     *  False for a value that is not a length. */
    canCompute: boolean;
};

export const SpacingVariables: SpacingVariable[] = [
    // The spacing scale, smallest first. Every chrome distance is one of these.
    {
        name: '--wordplay-spacing-quarter',
        cssValue: '0.125rem',
        canCompute: true,
    },
    { name: '--wordplay-spacing-half', cssValue: '0.25rem', canCompute: true },
    { name: '--wordplay-spacing', cssValue: '0.5rem', canCompute: true },
    { name: '--wordplay-spacing-double', cssValue: '1rem', canCompute: true },
    { name: '--wordplay-spacing-triple', cssValue: '1.5rem', canCompute: true },
    { name: '--wordplay-spacing-quad', cssValue: '2rem', canCompute: true },

    // Borders, focus, and the shapes chrome is drawn with.
    { name: '--wordplay-border-width', cssValue: '1px', canCompute: true },
    { name: '--wordplay-focus-width', cssValue: '4px', canCompute: true },
    { name: '--wordplay-border-radius', cssValue: '8px', canCompute: true },

    // Sizes a control has to meet or fill.
    { name: '--wordplay-widget-height', cssValue: '1.5em', canCompute: true },
    { name: '--wordplay-target-size', cssValue: '24px', canCompute: true },
    { name: '--wordplay-marker-size', cssValue: '24px', canCompute: true },
    { name: '--wordplay-min-line-height', cssValue: '3ex', canCompute: true },

    // The editor's own measures.
    { name: '--wordplay-editor-indent', cssValue: '3em', canCompute: true },
    { name: '--wordplay-editor-radius', cssValue: '3px', canCompute: true },
    {
        name: '--wordplay-palette-min-width',
        cssValue: '5em',
        canCompute: true,
    },
    {
        name: '--wordplay-palette-max-width',
        cssValue: '15em',
        canCompute: true,
    },
];

/**
 * Tokens declared in app.html's spacing block that this page deliberately does
 * not document, each with the reason the completeness test accepts.
 *
 * The block-editor density variables are redefined per density
 * (`.editor.density-compact` / `-spacious`), so a single value on a reference
 * page would be true in one of three states and misleading in the other two.
 */
export const UndocumentedSpacing: Record<string, string> = {
    '--wordplay-block-padding-block':
        'Redefined per editor density, so one value here would be wrong in two of three states.',
    '--wordplay-block-padding-inline':
        'Redefined per editor density, so one value here would be wrong in two of three states.',
    '--wordplay-block-insertion-margin':
        'Redefined per editor density, so one value here would be wrong in two of three states.',
    '--wordplay-block-stack-gap':
        'Redefined per editor density, and defined in terms of another token rather than a literal.',
    '--wordplay-font-weight': 'A weight, not a length.',
    '--wordplay-code-line-height': 'A unitless ratio, not a length.',
};
