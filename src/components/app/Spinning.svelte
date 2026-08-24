<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Logo from './Logo.svelte';

    interface Props {
        label?: LocaleTextAccessor | undefined;
        /** A number is rem; a string is any CSS length, so a caller can size
         *  the mark to its own line box rather than to a root-relative value
         *  that may not fit it. */
        size?: number | string;
        spin?: boolean;
    }

    /* Default of 2rem: any smaller and the typing dots inside the bubble
       stop being legible. */
    let { label = undefined, size = 2, spin = true }: Props = $props();

    const length = $derived(typeof size === 'number' ? `${size}rem` : size);
</script>

<!-- A span, not a div, because this is rendered inline inside phrasing-only
     contexts (paragraphs, buttons), where a div is invalid and triggers
     hydration mismatches. -->
<!-- role="status" is the ARIA role for advisory progress content: it makes
     the label announcement legal (a bare span may not carry aria-label) and
     is an implicit polite, atomic live region, replacing the previous
     hand-set aria-live attributes. -->
<span
    class="spinner"
    class:spin
    style="width: {length}; height: {length};"
    role="status"
    aria-label={$locales.getPrimaryPlainText(
        label ?? ((l) => l.ui.widget.loading.message),
    )}
>
    <!-- The logo's shapes face: the bubble is "about to make something." The
         wave is factor-gated inside Logo, so reduced motion shows a still
         mark. The mark is decorative here; this span's label carries the
         meaning. -->
    <Logo variant="shapes" pulse={spin} size={length} />
</span>

<style>
    .spinner {
        display: inline-block;
        line-height: 0;
        /* Invisible by default so spin={false} still reserves the box as a
           layout placeholder (see Join.svelte). */
        opacity: 0;
    }

    .spinner.spin {
        opacity: 1;
    }
</style>
