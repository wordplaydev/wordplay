<script lang="ts">
    import App from '../components/App.svelte';
    import { preferredLanguages } from '../translation/translations';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
</svelte:head>

<div lang={$preferredLanguages[0]}>
    <App />
</div>

<style>
    :global(body) {
        background-color: var(--wordplay-background);
        padding: 0;
        margin: 0;
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    :global(html) {
        box-sizing: border-box;
    }

    :global(*) {
        box-sizing: inherit;
    }
</style>
