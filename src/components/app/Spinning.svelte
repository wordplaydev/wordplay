<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        label?: LocaleTextAccessor | undefined;
        size?: number;
    }

    let { label = undefined, size = 2 }: Props = $props();
</script>

<div
    class="cursor"
    style="width: {size}rem; height: {size}rem;"
    aria-live="assertive"
    aria-atomic="true"
    aria-relevant="all"
    aria-label={$locales.get(label ?? ((l) => l.ui.widget.loading.message))}
></div>

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
