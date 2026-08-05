<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        label?: LocaleTextAccessor | undefined;
        size?: number;
        spin?: boolean;
    }

    let { label = undefined, size = 1.5, spin = true }: Props = $props();
</script>

<!-- A span, not a div, because this is rendered inline inside phrasing-only
     contexts (paragraphs, buttons), where a div is invalid and triggers
     hydration mismatches. -->
<!-- role="status" is the ARIA role for advisory progress content: it makes
     the label announcement legal (a bare span may not carry aria-label) and
     is an implicit polite, atomic live region, replacing the previous
     hand-set aria-live attributes. -->
<span
    class="cursor"
    class:spin
    style="width: {size}rem; height: {size}rem;"
    role="status"
    aria-label={$locales.getPrimaryPlainText(
        label ?? ((l) => l.ui.widget.loading.message),
    )}
></span>

<style>
    .cursor {
        display: inline-block;
        transform-origin: center;
        border: var(--wordplay-inactive-color) solid
            calc(2 * var(--wordplay-border-width));
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        width: 1em;
        height: 1em;
        opacity: 0;
    }

    .cursor.spin {
        opacity: 1;
        animation: spin infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
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
