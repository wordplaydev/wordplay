<script>
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
</script>

<div class="beta">
    <MarkupHTMLView markup={(l) => l.ui.page.landing.beta} /></div
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
