<script lang="ts">
    import { locales } from '@db/Database';

    export let label: string | undefined = undefined;
    export let large = false;
</script>

<div
    class="cursor"
    class:large
    aria-live="assertive"
    aria-atomic="true"
    aria-relevant="all"
    aria-label={label ?? $locales.get((l) => l.ui.widget.loading.message)}
/>

<style>
    .cursor {
        display: inline-block;
        animation: spin infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
        transform-origin: center;
        border: var(--wordplay-inactive-color) solid var(--wordplay-focus-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        width: 1em;
        height: 1em;
    }

    .large {
        font-size: 200%;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(180deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
