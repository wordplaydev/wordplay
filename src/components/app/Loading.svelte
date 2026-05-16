<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import Spinning from '@components/app/Spinning.svelte';
</script>

<div class="container">
    <Spinning label={(l) => l.ui.widget.loading.message} size={2} />
    <Subheader text={(l) => l.ui.widget.loading.message} compact />
</div>

<style>
    .container {
        width: 100dvw;
        height: 100dvh;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
