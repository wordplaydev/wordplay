
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import Header from '../components/Header.svelte';
    import { project } from '../models/stores';
    import { onMount, setContext } from 'svelte';
    import ProjectView from './ProjectView.svelte';
    import { writable } from 'svelte/store';
    import type LanguageCode from '../nodes/LanguageCode';
    import Loading from './Loading.svelte';
    import { LanguageSymbol } from '../editor/Contexts';

    // An interface-wide list of preferred languages.
    let languages = writable<LanguageCode[]>(["eng"]);

    // Don't display the manager until the fonts are loaded.
    let fontsLoaded = false;

    // Wait for the fonts to load before we display
    onMount(() => document.fonts.ready.then(() => fontsLoaded = true));

    // Store in a context for easy access by components.
    setContext(LanguageSymbol, languages);

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