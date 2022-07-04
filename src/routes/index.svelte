<script>
    import Manager from './Manager.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,500;0,700;1,500;1,700&display=swap" rel="stylesheet">
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

    :global(:root){
        --wordplay-foreground: rgb(255,255,255);  
        --wordplay-medium: rgb(60, 60, 60);
        --wordplay-background: rgb(0,0,0);
        --wordplay-highlight: rgb(255, 220, 43);
        --wordplay-spacing: 1em;
        --wordplay-font-face: "Noto Sans", sans-serif;
        --wordplay-font-weight: 500;
    }
</style>