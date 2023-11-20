<script>
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
</script>

<div class="beta">
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.landing.beta)} /></div
>

<style>
    .beta {
        border: var(--wordplay-warning) solid var(--wordplay-focus-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
    }
</style>
