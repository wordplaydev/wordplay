<script lang="ts">
    import { getHeadingLevel } from '@components/app/headingLevel.js';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    interface Props {
        text?: LocaleTextAccessor;
        children?: Snippet;
        compact?: boolean;
        /** Allow the header to wrap across lines. Off by default (headers are usually
         *  short); on for headers that grow wide, e.g. when several chosen locales are
         *  echoed after the primary. */
        wrap?: boolean;
    }

    let {
        text,
        children,
        compact: compact = false,
        wrap = false,
    }: Props = $props();

    // Read once at construction: a section's depth is fixed by where it is rendered.
    const level = getHeadingLevel();
</script>

<svelte:element
    this={`h${level}`}
    class:compact
    class:wrap
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
       out-specifies `h3:not(:first-of-type)`. */
    .subheader[data-level] {
        font-size: min(6vw, 16pt);
        margin-block-start: 1.5em;
        margin-block-end: var(--wordplay-spacing);
        white-space: nowrap;
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
        margin-block-start: 1em;
    }

    .subheader[data-level='5'],
    .subheader[data-level='6'] {
        font-size: min(4.5vw, 11pt);
        margin-block-start: 1em;
    }

    .subheader[data-level].compact {
        font-size: min(4vw, 16pt);
        margin: 0;
        /* A control label, not a title over content, so it stays chrome
           while other headings are selectable. */
        user-select: none;
        -webkit-user-select: none;
    }

    /* Only that it may wrap. It used to centre too, which left a gallery's name
       and a moderation queue's subject floating in the middle of a left-aligned
       column — every other heading on those pages starts at the inline edge. A
       caller that wants its heading centred centres it, as Loading does. */
    .subheader[data-level].wrap {
        white-space: normal;
    }
</style>
