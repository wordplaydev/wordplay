<script>
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
</script>

<div class="beta">
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.landing.beta)} /></div
>

<style>
    .beta {
        border: var(--wordplay-warning) solid var(--wordplay-border-width);
        width: 100%;
        background: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        white-space: break-spaces;
    }
</style>
