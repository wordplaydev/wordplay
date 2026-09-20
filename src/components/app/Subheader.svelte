<script lang="ts">
    import { getHeadingLevel } from '@components/app/headingLevel.js';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    interface Props {
        text?: LocaleTextAccessor;
        children?: Snippet;
        /** A control label: small, and carrying no margin at all. Twelve call
         *  sites depend on that, so it cannot grow one. */
        compact?: boolean;
        /**
         * A heading over the content it introduces: small like `compact`, with
         * no space above, but keeping the space below that separates it from
         * what follows. Without that gap the heading and its content run
         * together and read as two siblings in an evenly spaced column.
         */
        spaced?: boolean;
    }

    let { text, children, compact = false, spaced = false }: Props = $props();

    // Read once at construction: a section's depth is fixed by where it is rendered.
    const level = getHeadingLevel();
</script>

<svelte:element
    this={`h${level}`}
    class:compact
    class:spaced
    class="subheader"
    data-level={level}
    >{#if children}{@render children()}{:else if text}<LocalizedText
            path={text}
        />{/if}</svelte:element
>

<style>
    /* One treatment at every level, with size carrying the hierarchy.
    
       The global prose rules in app.html are written for a document — they make
       an `h3` italic, un-bold it only when it is the *first* of its type in its
       parent, and rotate `h1`-`h3` but not `h4`. Applied to a stack of sibling
       section headings that says nothing true: a list of sources came out as one
       un-bold italic heading, then bold italic ones, then upright unrotated
       ones, with position in the DOM deciding which. Attribute selector so this
       out-specifies `h3:not(:first-of-type)`.

       Headings also wrap. They used to be `nowrap`, which is fine for a short
       English label and wrong for everything else: every heading here sits over
       localized text, and one that can't break sets a min-content floor its
       container can't shrink below, so the whole page scrolls sideways on a
       phone (WCAG 1.4.10). Callers opted out one at a time as someone noticed —
       the opt-in list was just "where it was caught". Wrapping renders
       identically wherever a heading already fits. */
    .subheader[data-level] {
        font-size: min(6vw, 16pt);
        /* scale: relative to the heading's own size, which this file sets per level. */
        margin-block-start: 1.5em;
        margin-block-end: var(--wordplay-spacing);
        font-style: normal;
        font-weight: bold;
        transform: rotate(-1deg);
    }

    .subheader[data-level]:first-child {
        margin-block-start: 0;
    }

    /* A nested section reads as subordinate, not as another peer. Size rather than
       weight, since these sit among code and prose that are already bold in places. */
    .subheader[data-level='3'] {
        font-size: min(5.5vw, 14pt);
    }

    .subheader[data-level='4'] {
        font-size: min(5vw, 12pt);
        /* scale: relative to the heading's own size, which this file sets per level. */
        margin-block-start: 1em;
    }

    .subheader[data-level='5'],
    .subheader[data-level='6'] {
        font-size: min(4.5vw, 11pt);
        /* scale: relative to the heading's own size, which this file sets per level. */
        margin-block-start: 1em;
    }

    .subheader[data-level].spaced {
        font-size: min(4vw, 16pt);
        margin-block: 0 var(--wordplay-spacing);
    }

    .subheader[data-level].compact {
        font-size: min(4vw, 16pt);
        margin: 0;
        /* A control label, not a title over content, so it stays chrome
           while other headings are selectable. */
        user-select: none;
        -webkit-user-select: none;
    }
</style>
