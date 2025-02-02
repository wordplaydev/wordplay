<script lang="ts">
    import { animationDuration } from '@db/Database';
    import { slide } from 'svelte/transition';

    interface Props {
        inline?: boolean;
        children?: import('svelte').Snippet;
    }

    let { inline = false, children }: Props = $props();
</script>

{#if inline}<span class="feedback">{@render children?.()}</span>{:else}
    <p class="feedback" transition:slide={{ duration: $animationDuration }}
        >{@render children?.()}</p
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

    span {
        display: inline-block;
    }

    p {
        font-size: medium;
        text-align: center;
    }
</style>
