<script lang="ts">
    import { type Snippet } from 'svelte';
    interface Props {
        children: Snippet;
        kind?: 'meta' | 'section' | 'salient';
    }

    let { children, kind = 'section' }: Props = $props();
</script>

<div class="action {kind}">
    {@render children()}
</div>

<style>
    .action {
        min-width: 15em;
        width: calc(50% - var(--wordplay-spacing));
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
        gap: var(--wordplay-spacing);
    }

    .meta {
        background: var(--wordplay-alternating-color);
    }

    .salient {
        animation: salient calc(var(--animation-factor) * 2s) ease-in-out
            infinite;
        outline: solid var(--wordplay-focus-width)
            var(--wordplay-highlight-color);
        border: none;
        background: var(--wordplay-alternating-color);
    }

    @keyframes salient {
        0% {
            outline-width: var(--wordplay-border-width);
        }
        50% {
            outline-width: var(--wordplay-focus-width);
        }
        100% {
            outline-width: var(--wordplay-border-width);
        }
    }
</style>
