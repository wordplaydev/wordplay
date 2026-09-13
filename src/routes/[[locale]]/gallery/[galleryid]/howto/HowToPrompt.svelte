<!-- modified from Subheader, except it allows h2 to wrap -->

<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    interface Props {
        text?: LocaleTextAccessor;
        children?: Snippet;
        compact?: boolean;
    }

    let { text, children, compact: compact = false }: Props = $props();
</script>

<h2 class:compact
    >{#if children}{@render children()}{:else if text}<LocalizedText
            path={text}
        />{/if}</h2
>

<style>
    h2 {
        font-size: min(6vw, 16pt);
        margin-block-start: 1.5em;
        margin-block-end: var(--wordplay-spacing);
        /* white-space: nowrap; */
    }

    h2:first-child {
        margin-block-start: 0;
    }

    /* Compact drops the big space a question opens with, not the one that
       separates it from its answer — with `margin: 0` the two ran together. */
    .compact {
        font-size: min(4vw, 16pt);
        margin-block: 0 var(--wordplay-spacing);
    }
</style>
