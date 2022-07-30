<script>

    import Project from '../models/Project';
    import Manager from '../components/Manager.svelte';
    import { project } from '../models/stores';

    project.set(new Project("Play", "↓⏱\n🥹: {⊤: «😀» ⊥: «😂»}\n∥: ⏱ % 2 = 0ms\nW(🥹{∥} 32pt «Noto Sans»)", () => project.set($project)));

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
        --wordplay-foreground: black; 
        --wordplay-background: white;
        --wordplay-chrome: rgb(240,240,240);
        --wordplay-border-color: rgb(230,230,230);
        --wordplay-highlight: rgb(237, 206, 53);
        --wordplay-spacing: 0.5em;
        --wordplay-font-face: "Noto Sans", sans-serif;
        --wordplay-font-weight: 500;
        --wordplay-border-width: 4px;
        --wordplay-border-radius: 6px;
    }

    :global(textarea) {
        border: none;
        resize: none;
    }

    :global(textarea:focus, .verse:focus) {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight)
    }
</style>