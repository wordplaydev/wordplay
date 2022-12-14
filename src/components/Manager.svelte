
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import Header from '../components/Header.svelte';
    import { project } from '../models/stores';
    import { onMount } from 'svelte';
    import ProjectView from './ProjectView.svelte';
    import Loading from './Loading.svelte';

    // Don't display the manager until the fonts are loaded.
    let fontsLoaded = false;

    // Wait for the fonts to load before we display
    onMount(() => document.fonts.ready.then(() => fontsLoaded = true));

</script>

{#if fontsLoaded }
    <div class="manager">
        <Header></Header>
        <ProjectView project={$project} />
    </div>
{:else}
    <Loading/>
{/if}

<style>
    .manager {
        width: 100vw;
        height: 100vh;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        box-sizing: border-box;
        gap: var(--wordplay-spacing);
    }
</style>