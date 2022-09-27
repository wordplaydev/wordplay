<script>

    import Manager from '../components/Manager.svelte';

</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Emoji&family=Noto+Sans+Mono:wght@400;700&family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
</svelte:head>

<Manager/>

<style>
    :global(body) {
        background-color: var(--wordplay-background);
        padding: 0;
        margin: 0;
        font-family: var(--wordplay-font-face);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }
</style>