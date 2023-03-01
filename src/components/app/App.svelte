<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { animationsOn, project } from '../../models/stores';
    import { onMount, setContext } from 'svelte';
    import ProjectView from '../project/ProjectView.svelte';
    import Loading from './Loading.svelte';
    import ProjectChooser from './ProjectChooser.svelte';
    import { ProjectSymbol, type ProjectContext } from '../project/Contexts';
    import { PUBLIC_CONTEXT } from '$env/static/public';

    if (PUBLIC_CONTEXT !== 'prod') console.log(`*** ${PUBLIC_CONTEXT} ***`);

    // Don't display the manager until the fonts are loaded.
    let fontsLoaded = false;

    // Wait for the fonts to load before we display
    onMount(() => document.fonts.ready.then(() => (fontsLoaded = true)));

    /** A global context for the current project */
    setContext<ProjectContext>(ProjectSymbol, project);
</script>

<main class:animated={$animationsOn}>
    {#if fontsLoaded}
        {#if PUBLIC_CONTEXT === 'prod'}
            <div class="teaser">
                <h1><strong>Wordplay.dev</strong> is coming</h1>
                <p>Curious? Write <a href="https://amyjko.com">Amy</a></p>
            </div>
        {:else if $project}
            <ProjectView project={$project} />
        {:else}
            <ProjectChooser />
        {/if}
    {:else}
        <Loading />
    {/if}
</main>

<style>
    .teaser {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
</style>
