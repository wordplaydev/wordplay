<script lang="ts">
    import Settings from '../settings/Settings.svelte';
</script>

<main class="page">
    <slot />
</main>
<footer>
    <div class="footer"><Settings /></div>
</footer>

<style>
    .page {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .footer {
        position: fixed;
        bottom: 0;
        right: 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    main:focus {
        outline: none !important;
    }
</style>
