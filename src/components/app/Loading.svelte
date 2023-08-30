<script lang="ts">
    import Spinning from './Spinning.svelte';
    import { locale } from '@db/Database';
</script>

<div class="container">
    <Spinning label={$locale.ui.widget.loading.message} />
    <div>{$locale.ui.widget.loading.message}</div>
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
        font-size: xx-large;
        font-size: medium;
    }
</style>
