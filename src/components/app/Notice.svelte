<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { animationDuration } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import { slide } from 'svelte/transition';

    interface Props {
        inline?: boolean;
        text?: LocaleTextAccessor;
        children?: Snippet;
    }

    let { inline = false, text, children }: Props = $props();
</script>

{#if inline}<span class="feedback">{@render children?.()}</span>{:else}
    <p class="feedback" transition:slide={{ duration: $animationDuration }}
        >{#if children}{@render children()}{:else if text}<LocalizedText
                path={text}
            />{/if}</p
    >{/if}

<style>
    .feedback {
        font-family: var(--wordplay-app-font);
        font-weight: normal;
        color: var(--wordplay-background);
        background: var(--wordplay-error);
        margin-block-start: var(--wordplay-spacing);
        padding: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
        flex-grow: 0;
    }

    .feedback > :global(a) {
        color: var(--wordplay-background);
        text-decoration: var(--wordplay-focus-width) underline
            var(--wordplay-background);
    }

    span {
        display: inline-block;
    }

    p {
        text-align: center;
    }
</style>
