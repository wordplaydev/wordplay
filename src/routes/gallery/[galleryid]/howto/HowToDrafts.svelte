<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
</script>

<div class="draftspace">
    <Subheader text={(l) => l.ui.howto.canvasView.draftsheader} />
    <MarkupHTMLView markup={(l) => l.ui.howto.canvasView.draftsprompt} />
</div>

<style>
    .draftspace {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-height: 20em;
    }
</style>
