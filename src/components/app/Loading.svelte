<script lang="ts">
    import { fade } from 'svelte/transition';
    import Spinning from './Spinning.svelte';
    import { animationDuration, locales } from '@db/Database';
</script>

<div class="container" out:fade={{ duration: $animationDuration }}>
    <Spinning label={$locales.get((l) => l.ui.widget.loading.message)} large />
    <p>{$locales.get((l) => l.ui.widget.loading.message)}</p>
</div>

<style>
    .container {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
