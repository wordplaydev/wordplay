
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import Header from '../components/Header.svelte';
    import { project } from '../models/stores';
    import { onDestroy } from 'svelte';
    import ProjectView from './ProjectView.svelte';

    // Clean up the project when unmounted.
    onDestroy(() => $project.cleanup());

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