<script lang="ts">
    import Settings from '../settings/Settings.svelte';
    import { page } from '$app/stores';
</script>

<main class="page">
    <slot />
</main>
<footer>
    <div class="footer"
        ><Settings />{#if $page.route.id !== '/'}<a href="/">🏠</a
            >{:else}🏠{/if}</div
    >
</footer>

<style>
    .page {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--wordplay-spacing);
    }

    .footer {
        position: fixed;
        bottom: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
