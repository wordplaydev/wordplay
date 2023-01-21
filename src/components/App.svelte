<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { project } from '../models/stores';
    import { onMount } from 'svelte';
    import ProjectView from './ProjectView.svelte';
    import Loading from './Loading.svelte';
    import ProjectChooser from './ProjectChooser.svelte';

    // Don't display the manager until the fonts are loaded.
    let fontsLoaded = false;

    // Wait for the fonts to load before we display
    onMount(() => document.fonts.ready.then(() => (fontsLoaded = true)));
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
