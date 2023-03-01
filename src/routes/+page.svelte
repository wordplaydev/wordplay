<script lang="ts">
    import App from '../components/app/App.svelte';
    import { preferredLanguages } from '@translation/translations';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
</svelte:head>

<div lang={$preferredLanguages[0]}>
    <App />
</div>
