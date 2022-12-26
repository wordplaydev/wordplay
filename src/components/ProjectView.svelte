
<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { onDestroy, setContext } from "svelte";
    import { writable } from "svelte/store";
    import { type DraggedContext, DraggedSymbol, type ProjectContext, ProjectSymbol } from "../editor/util/Contexts";
    import KeyboardIdle from "../models/KeyboardIdle";
    import type Project from "../models/Project";
    import Palette from "./Palette.svelte";
    import SourceView from "./SourceView.svelte";
    import NodeView from "../editor/NodeView.svelte";
    import type Tree from "../nodes/Tree";
    import type Source from "../models/Source";
    import { playing, currentStep } from "../models/stores";

    export let project: Project;

    // The currently viewed source
    let activeSourceName = project.main.getNames()[0];
    let activeSource: Source | undefined = undefined;
    $: activeSource = project.getSources().find(source => source.getNames()[0] === activeSourceName) ?? project.main;

    // Clean up the project when unmounted.
    onDestroy(() => project.cleanup());

    $: {
        // If the keyboard is idle and the evaluator hasn't started yet, analyze the program and evaluate it.
        if($KeyboardIdle && !project.evaluator.isStarted()) {
            project.analyze();
            project.evaluate();
        }
    }

    // Create a global context for a node being dragged
    let dragged = writable<Tree | undefined>(undefined);
    setContext<DraggedContext>(DraggedSymbol, dragged);

    // Create a global context for the project
    let projectStore = writable<Project>(project);
    setContext<ProjectContext>(ProjectSymbol, projectStore);

    // Create a global full screen flag
    let fullscreen = false;
    let input: HTMLInputElement | null = null;

    let mouseX = 0;
    let mouseY = 0;

    function handleActivate(event: CustomEvent<{ source: Source }>) {
        activeSourceName = event.detail.source.getNames()[0];
    }

    function handleFullscreen(event: CustomEvent<{ on: boolean }>) {
        fullscreen = event.detail.on;
    }

    // When stepping and the current step changes, change the active source.
    $: stepping = !$playing;
    $: {
        if(!$playing && $currentStep) {
            if(!activeSource?.contains($currentStep.node)) {
                activeSource = project.getSourceOf($currentStep.node);
            }
        }
    }

</script>

<!-- Render the app header and the current project, if there is one. -->
<div 
    class="project" 
    on:mousedown={() => input?.focus() }
    on:mouseup={() => dragged.set(undefined)}
    on:mousemove={event => { if($dragged) { mouseX = event.clientX + window.scrollX; mouseY = event.clientY + window.scrollY; } }}
    on:keydown={event => event.key === "Escape" ? fullscreen = false : undefined }
>
    <Palette hidden={stepping}/>
    <div class="source">
        {#if activeSource}
            <SourceView {project} source={activeSource} {fullscreen} on:fullscreen={handleFullscreen} bind:input={input} on:activate={handleActivate}/>
        {:else}
            No source selected
        {/if}
    </div>
    <!-- Render the dragged node over the whole project -->
    {#if $dragged !== undefined}
        <div class="draggable" style="left: {mouseX}px; top:{mouseY}px;"><NodeView node={$dragged.node}/><div class="cursor">🐲</div></div>
    {/if}
</div>

<style>

    .project {
        width: 100vw;
        height: 100vh;
        background-color: var(--wordplay-background);

        display: flex;
        flex-direction: row;
    }
    
    .source {
        flex-grow: 1;
        min-width: 10em;
        min-height: 10em;
    }

    .draggable {
        position: absolute;
        cursor: none;
        z-index: var(--wordplay-layer-drag);
        white-space: nowrap;
        pointer-events: none;
    }

    /* A fancy dragon cursor for dragon drop! Get it? */
    .cursor {
        position: absolute;
        font-size: 2rem;
        top: -1.5rem;
        left: -1.5rem;
        font-family: "Noto Sans";
        pointer-events: none;
    }

</style>