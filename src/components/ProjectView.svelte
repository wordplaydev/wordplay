<script lang="ts">
    import { onDestroy, setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        type DraggedContext,
        DraggedSymbol,
        type ProjectContext,
        ProjectSymbol,
    } from '../editor/util/Contexts';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import Palette from './Palette.svelte';
    import SourceView from './SourceView.svelte';
    import type Tree from '../nodes/Tree';
    import type Source from '../nodes/Source';
    import { playing, currentStep, nodeConflicts } from '../models/stores';
    import Annotations from './Annotations.svelte';
    import type Conflict from '../conflicts/Conflict';
    import type Rect from './Rect';
    import Split from './Split.svelte';
    import RootView from '../editor/RootView.svelte';
    import Highlight from '../editor/Highlight.svelte';
    import { afterUpdate } from 'svelte';
    import getOutlineOf, { getUnderlineOf } from '../editor/util/outline';
    import type { HighlightSpec } from '../editor/util/Highlights';

    export let project: Project;

    // The currently viewed source
    let activeSourceName = project.main.getNames()[0];
    let activeSource: Source = project.main;
    $: activeSource =
        project
            .getSources()
            .find((source) => source.getNames()[0] === activeSourceName) ??
        project.main;

    // The conflicts focused in the editor
    let conflicts: Conflict[] = [];

    let viewport: Rect;

    /** A global full screen flag */
    let fullscreen = false;
    let input: HTMLInputElement | null = null;

    let mouseX = 0;
    let mouseY = 0;

    // Clean up the project when unmounted.
    onDestroy(() => project.cleanup());

    $: {
        // If the keyboard is idle and the evaluator hasn't started yet, analyze the program and evaluate it.
        if ($KeyboardIdle && !project.evaluator.isStarted()) {
            project.analyze();
            nodeConflicts.set(project.getConflicts());
            project.evaluate();
        }
    }

    // Create a global context for a node being dragged
    let dragged = writable<Tree | undefined>(undefined);
    setContext<DraggedContext>(DraggedSymbol, dragged);

    // Create a global context for the project
    let projectStore = writable<Project>(project);
    setContext<ProjectContext>(ProjectSymbol, projectStore);

    function handleActivate(event: CustomEvent<{ source: Source }>) {
        activeSourceName = event.detail.source.getNames()[0];
    }

    function handleFullscreen(event: CustomEvent<{ on: boolean }>) {
        fullscreen = event.detail.on;
    }

    // When stepping and the current step changes, change the active source.
    $: stepping = !$playing;
    $: {
        if (!$playing && $currentStep) {
            if (!activeSource?.contains($currentStep.node)) {
                activeSource =
                    project.getSourceOf($currentStep.node) ?? project.main;
            }
        }
    }

    let dragContainer: HTMLElement | undefined;
    let outline: HighlightSpec | undefined = undefined;

    // Measure an outline of the node view in the drag container.
    afterUpdate(() => {
        const nodeView = dragContainer?.querySelector('.node-view');
        if (nodeView instanceof HTMLElement)
            outline = {
                types: ['dragging'],
                outline: getOutlineOf(nodeView),
                underline: getUnderlineOf(nodeView),
            };
    });
</script>

<!-- Render the app header and the current project, if there is one. -->
<div
    class="project"
    on:mousedown={() => input?.focus()}
    on:mouseup={() => dragged.set(undefined)}
    on:mouseleave={() => dragged.set(undefined)}
    on:mousemove={(event) => {
        mouseX = event.clientX + window.scrollX;
        mouseY = event.clientY + window.scrollY;
    }}
    on:keydown={(event) =>
        event.key === 'Escape' ? (fullscreen = false) : undefined}
>
    <Split split={20} min={20} max={40} hide={stepping}>
        <Palette slot="first" hidden={stepping} />
        <div slot="last" class="source">
            <SourceView
                {project}
                source={activeSource}
                {fullscreen}
                bind:input
                bind:conflicts
                bind:viewport
                on:fullscreen={handleFullscreen}
                on:activate={handleActivate}
            />
            <Annotations {project} {conflicts} {stepping} {viewport} />
        </div>
    </Split>
    <!-- Render the dragged node over the whole project -->
    {#if $dragged !== undefined}
        {#if outline}<Highlight {...outline} />{/if}
        <div
            class="drag-container dragging"
            style="left: {mouseX}px; top:{mouseY}px;"
            bind:this={dragContainer}
        >
            <RootView
                node={$dragged.node}
                spaces={project.getSourceOf($dragged.node)?.spaces}
            />
            <div class="cursor">🐲</div>
        </div>
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
        flex: 1;
        min-width: 2em;
        min-height: 2em;
    }

    .drag-container {
        position: absolute;
        cursor: none;
        z-index: var(--wordplay-layer-drag);
        pointer-events: none;
    }

    /* A fancy dragon cursor for dragon drop! Get it? */
    .cursor {
        position: absolute;
        font-size: 2rem;
        top: -1.5rem;
        left: -1.5rem;
        font-family: 'Noto Sans';
        pointer-events: none;
    }

    .drag-container :global(.token-view .text) {
        color: var(--wordplay-background);
    }
</style>
