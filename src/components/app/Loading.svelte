<script lang="ts">
    import Text from '@components/widgets/LocalizedText.svelte';
    import Spinning from './Spinning.svelte';
</script>

<div class="container">
    <Spinning label={(l) => l.ui.widget.loading.message} size={2} />
    <p><Text path={(l) => l.ui.widget.loading.message} /></p>
</div>

<style>
    .container {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
