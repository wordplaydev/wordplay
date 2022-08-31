<script>

    import Project from '../models/Project';
    import Manager from '../components/Manager.svelte';
    import { caret, project } from '../models/stores';
    import { examples } from '../examples/examples';
    import Caret from '../models/Caret';

    const newProject = new Project("Play", examples.WhatWord, () => project.set($project));
    project.set(newProject);
    caret.set(new Caret(newProject, 0));

</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,500;0,700;1,500;1,700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@400;700&family=Noto+Sans:ital,wght@0,500;0,700;1,500;1,700&display=swap" rel="stylesheet">
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
        font-family: "Noto Sans mono", monospace;
        font-size: small;
    }

    :global(textarea:focus, .verse:focus) {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight)
    }
</style>