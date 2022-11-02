
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import Header from '../components/Header.svelte';
    import { project } from '../models/stores';
    import { setContext } from 'svelte';
    import ProjectView from './ProjectView.svelte';
    import { writable } from 'svelte/store';
    import type LanguageCode from '../nodes/LanguageCode';

    // An interface-wide list of preferred languages.
    let languages = writable<LanguageCode[]>(["eng"]);

    // Store in a context for easy access by components.
    setContext("languages", languages);

</script>

<div class="manager">
    <Header></Header>
    <ProjectView project={$project} />
</div>

<style>
    .manager {
        width: 100vw;
        height: 100vh;
        padding: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }
</style>