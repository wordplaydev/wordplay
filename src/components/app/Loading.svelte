<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import Spinning from '@components/app/Spinning.svelte';
</script>

<div class="container">
    <Spinning label={(l) => l.ui.widget.loading.message} size={2} />
    <Subheader text={(l) => l.ui.widget.loading.message} compact wrap />
</div>

<style>
    /* Overlay the nearest positioned ancestor (the page content area, a chat
       panel, etc.) rather than taking a row in normal flow — so a loader shown
       alongside already-rendered content covers it instead of pushing it down.
       Each host that shows <Loading> beside other content sets position:
       relative; hosts that render it alone fall back to the layout's .content. */
    .container {
        position: absolute;
        inset: 0;
        background: var(--wordplay-background);
        z-index: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
