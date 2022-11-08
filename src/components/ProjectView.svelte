
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { onDestroy, setContext } from "svelte";
    import { writable } from "svelte/store";
    import { type DraggedContext, DraggedSymbol, type ProjectContext, ProjectSymbol } from "../editor/Contexts";
    import KeyboardIdle from "../models/KeyboardIdle";
    import type Project from "../models/Project";
    import Palette from "./Palette.svelte";
    import SourceView from "./SourceView.svelte";
    import type Node from "../nodes/Node";
    import NodeView from "../editor/NodeView.svelte";

    export let project: Project;

    // Clean up the project when unmounted.
    onDestroy(() => project.cleanup());

    $: {
        if($KeyboardIdle && !project.isEvaluating())
            project.evaluate();
    }

    // Create a global context for a node being dragged
    let dragged = writable<Node | undefined>(undefined);
    setContext<DraggedContext>(DraggedSymbol, dragged);

    // Create a global context for the project
    let projectStore = writable<Project>(project);
    setContext<ProjectContext>(ProjectSymbol, projectStore);

    let mouseX = 0;
    let mouseY = 0;

</script>

<!-- Render the app header and the current project, if there is one. -->
<div 
    class="project" 
    on:mouseup={() => dragged.set(undefined)}
    on:mousemove={event => { mouseX = event.clientX; mouseY = event.clientY; }}
>
    <Palette/>
    <div class="windows">
        <SourceView source={project.main}/>
        {#each project.supplements as source}
            <SourceView source={source} />
        {/each}
    </div>
    <!-- Render the dragged node over the whole project -->
    {#if $dragged !== undefined}
        <div class="draggable" style="left: {mouseX}px; top:{mouseY}px;"><NodeView node={$dragged}/><div class="cursor">🐲</div></div>
    {/if}
</div>

<style>

    .project {
        flex-grow: 1; /* Fill up the rest of the manager's space */
        min-width: 0;

        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .windows {
        flex-grow: 1; /* Fill up the rest of the project's space. */
        min-width: 0;
        height: auto;
        display: flex;
        flex-flow: column;
        align-items: stretch;
        justify-content: top;
        gap: var(--wordplay-spacing);
    }

    .draggable {
        position: absolute;
        cursor: none;
        z-index: 2;
        white-space: nowrap;
    }

    .cursor {
        position: absolute;
        font-size: 2rem;
        top: -1.5rem;
        left: -1.5rem;
        font-family: "Noto Sans";
    }
</style>