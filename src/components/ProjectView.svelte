
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import type Project from "../models/Project";
    import SourceView from "./SourceView.svelte";

    export let project: Project;

</script>

<!-- Render the app header and the current project, if there is one. -->
<div class="project">
    <div class="windows">
        <SourceView source={project.main}/>
        {#each project.supplements as source}
            <SourceView source={source} />
        {/each}
    </div>
</div>

<style>
    .windows {
        height: auto;
        padding: var(--wordplay-spacing);
        display: flex;
        flex-flow: row wrap;
        align-items: stretch;
        justify-content: center;
        gap: var(--wordplay-spacing);
    }
</style>