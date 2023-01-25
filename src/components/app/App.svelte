<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { project } from '../../models/stores';
    import { onMount, setContext } from 'svelte';
    import ProjectView from '../project/ProjectView.svelte';
    import Loading from './Loading.svelte';
    import ProjectChooser from './ProjectChooser.svelte';
    import { ProjectSymbol, type ProjectContext } from '../project/Contexts';
    import { writable } from 'svelte/store';
    import type Project from '../../models/Project';

    // Don't display the manager until the fonts are loaded.
    let fontsLoaded = false;

    // Wait for the fonts to load before we display
    onMount(() => document.fonts.ready.then(() => (fontsLoaded = true)));

    /** A global context for the current project */
    setContext<ProjectContext>(ProjectSymbol, project);
</script>

{#if fontsLoaded}
    {#if $project}
        <ProjectView project={$project} />
    {:else}
        <ProjectChooser />
    {/if}
{:else}
    <Loading />
{/if}
