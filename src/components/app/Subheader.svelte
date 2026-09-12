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
    .subheader {
        font-size: min(6vw, 16pt);
        margin-block-start: 1.5em;
        margin-block-end: var(--wordplay-spacing);
        white-space: nowrap;
    }

    .subheader:first-child {
        margin-block-start: 0;
    }

    /* A nested section reads as subordinate, not as another peer. Size rather than
       weight, since these sit among code and prose that are already bold in places. */
    .subheader[data-level='4'] {
        font-size: min(5vw, 13pt);
        margin-block-start: 1em;
    }

    .subheader[data-level='5'],
    .subheader[data-level='6'] {
        font-size: min(4.5vw, 11pt);
        margin-block-start: 1em;
    }

    .compact {
        font-size: min(4vw, 16pt);
        margin: 0;
        /* A control label, not a title over content, so it stays chrome
           while other headings are selectable. */
        user-select: none;
        -webkit-user-select: none;
    }

    .wrap {
        white-space: normal;
        text-align: center;
    }
</style>
