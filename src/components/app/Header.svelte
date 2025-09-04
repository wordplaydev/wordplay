<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';

    interface Props {
        /** Whether the header is in a list of blocks of text, and therefore should be offset to the inline start and have a block margin. */
        block?: boolean;
        wrap?: boolean;
        text?: LocaleTextAccessor;
        children?: Snippet;
    }

    let { block = true, wrap = false, text, children }: Props = $props();
</script>

<h1 class:block class:wrap
    >{#if children}{@render children()}{:else if text}<LocalizedText
            path={text}
        />{/if}</h1
>

<style>
    h1 {
        font-size: min(10vw, 60pt);
        margin-bottom: 0;
        flex-shrink: 0;
    }

    .wrap {
        word-break: break-all;
    }

    .block {
        margin-inline-start: -0.5rem;
        margin-block-end: calc(var(--wordplay-spacing) / 3);
    }
</style>
