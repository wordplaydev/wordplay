<script lang="ts">
    import { onDestroy, setContext, tick } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        type DraggedContext,
        DraggedSymbol,
        type ProjectContext,
        ProjectSymbol,
    } from '../editor/util/Contexts';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import Documentation from './Documentation.svelte';
    import type Tree from '../nodes/Tree';
    import {
        playing,
        currentStep,
        nodeConflicts,
        updateProject,
        selectedOutput,
    } from '../models/stores';
    import Annotations from './Annotations.svelte';
    import type Conflict from '../conflicts/Conflict';
    import RootView from '../editor/RootView.svelte';
    import Highlight from '../editor/Highlight.svelte';
    import { afterUpdate } from 'svelte';
    import getOutlineOf, { getUnderlineOf } from '../editor/util/outline';
    import type { HighlightSpec } from '../editor/util/Highlights';
    import { fade } from 'svelte/transition';
    import TileView, { type ResizeDirection } from './TileView.svelte';
    import Tile, { Content, Mode } from './Tile';
    import OutputView from './OutputView.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '../translation/translations';
    import type Value from '../runtime/Value';
    import Editor from '../editor/Editor.svelte';
    import Layout, { Arrangement, DocsID, OutputID, PaletteID } from './Layout';
    import NonSourceTileToggle from './NonSourceTileToggle.svelte';
    import Button from './Button.svelte';
    import Language from './Language.svelte';
    import OutputEditor from './Palette.svelte';
    import type Bounds from './Bounds';
    import type Source from '../nodes/Source';
    import MiniSourceView from './SourceTileToggle.svelte';
    import Timeline from './Timeline.svelte';

    export let project: Project;

    // The conflicts of interest in each editor.
    let conflictsOfInterest: Map<Source, Conflict[]> = new Map();
    // When the project changes, reset the conflicts map.
    $: {
        if (project) conflictsOfInterest = new Map();
    }

    // Build a list of visible conflicts of interest based on what tiles are expanded.
    $: visibleConflicts = Array.from(conflictsOfInterest.keys())
        // Get the list of sources that are expanded
        .filter(
            (source) =>
                layout.getSource(project.getIndexOfSource(source))?.mode ===
                Mode.Expanded
        )
        // Convert them into lists of conflicts
        .map((source) => conflictsOfInterest.get(source) ?? [])
        // Flatten the list
        .flat();

    /** A global full screen flag */
    let fullscreen = false;

    let mouseX = 0;
    let mouseY = 0;

    /** The background color of the output, so we can make the tile match. */
    let outputBackground: string | null;

    // Clean up the project when unmounted.
    onDestroy(() => project.cleanup());

    $: {
        // If the keyboard is idle and the evaluator hasn't started yet, analyze the program and evaluate it.
        if ($KeyboardIdle) {
            project.analyze();
            nodeConflicts.set(project.getConflicts());
        }
    }
    $: {
        if (!project.evaluator.isStarted()) project.evaluate();
    }

    // Create a global context for a node being dragged
    let dragged = writable<Tree | undefined>(undefined);
    setContext<DraggedContext>(DraggedSymbol, dragged);

    // Create a global context for the project
    let projectStore = writable<Project>(project);
    setContext<ProjectContext>(ProjectSymbol, projectStore);

    // When stepping and the current step changes, change the active source.
    $: stepping = !$playing;
    $: {
        if (!$playing && $currentStep) {
            const source = project.getSourceOf($currentStep.node);
            const tile = source
                ? layout.getSource(project.getIndexOfSource(source))
                : undefined;
            if (tile && tile.mode === Mode.Collapsed) {
                setMode(tile, Mode.Expanded);
            }
        }
    }

    // When output selection changes, make the palette visible.
    $: {
        if ($selectedOutput.length > 0) {
            const palette = layout.getPalette();
            if (palette && palette.mode === Mode.Collapsed)
                setMode(palette, Mode.Expanded);
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

    let canvasWidth: number = 1024;
    let canvasHeight: number = 768;

    let layout: Layout;
    $: layout = new Layout(
        [
            layout?.getOutput() ??
                new Tile(
                    OutputID,
                    $preferredTranslations[0].ui.tiles.output,
                    Content.Output,
                    Mode.Expanded,
                    undefined,
                    Tile.randomPosition(1024, 768)
                ),
            ...project
                .getSources()
                .map(
                    (source, index) =>
                        layout?.getSource(index) ??
                        new Tile(
                            Layout.getSourceID(index),
                            source.names.getTranslation($preferredLanguages),
                            Content.Source,
                            index === 0 ? Mode.Expanded : Mode.Collapsed,
                            undefined,
                            Tile.randomPosition(1024, 768)
                        )
                ),
            layout?.getPalette() ??
                new Tile(
                    PaletteID,
                    $preferredTranslations[0].ui.tiles.palette,
                    Content.Palette,
                    Mode.Collapsed,
                    undefined,
                    Tile.randomPosition(1024, 768)
                ),
            layout?.getDocs() ??
                new Tile(
                    DocsID,
                    $preferredTranslations[0].ui.tiles.docs,
                    Content.Documentation,
                    Mode.Collapsed,
                    undefined,
                    Tile.randomPosition(1024, 768)
                ),
        ],
        layout ? layout.arrangement : Arrangement.vertical,
        layout ? layout.fullscreenID : undefined
    );

    $: {
        if (canvasWidth && canvasHeight) {
            layout = layout.resized(canvasWidth, canvasHeight);
        }
    }

    function setMode(tile: Tile, mode: Mode) {
        layout = layout
            .withTileInMode(tile, mode)
            .resized(canvasWidth, canvasHeight);
    }

    function setFullscreen(tile: Tile, fullscreen: boolean) {
        layout = fullscreen
            ? layout.withFullscreen(tile.id)
            : layout.withoutFullscreen();
    }

    async function positionTile(tile: Tile, position: Bounds) {
        layout = layout.withTilePosition(tile, position);

        // Scroll tile into view if out
        await tick();
        if (draggedTile) scrollToTileView(tile.id);
    }

    let canvas: HTMLElement;
    let draggedTile:
        | {
              id: string;
              left: number;
              top: number;
              direction: ResizeDirection | null;
          }
        | undefined = undefined;

    let maxRight: number = 0;
    let maxBottom: number = 0;

    $: maxRight = Math.max.apply(undefined, [
        maxRight,
        ...layout.tiles.map((tile) => tile.position.left + tile.position.width),
    ]);
    $: maxBottom = Math.max.apply(undefined, [
        maxBottom,
        ...layout.tiles.map((tile) => tile.position.top + tile.position.height),
    ]);

    let latest: Value | undefined;
    $: {
        $currentStep;
        $preferredLanguages;
        latest = project.evaluator.getLatestSourceValue(project.main);
    }

    function handleMouseDown(event: MouseEvent) {
        if (layout.arrangement !== Arrangement.free) return;

        const tileView = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.tile');

        if (tileView instanceof HTMLElement && tileView.dataset.id) {
            const rect = tileView.getBoundingClientRect();
            const id = tileView.dataset.id;

            draggedTile = {
                id: id,
                left: event.clientX - rect.left,
                top: event.clientY - rect.top,
                direction: null,
            };
        }
    }

    async function handleMouseMove(event: MouseEvent) {
        mouseX = event.clientX + canvas.scrollLeft;
        mouseY = event.clientY + canvas.scrollTop;

        if (draggedTile) {
            const tile = layout.getTileWithID(draggedTile.id);
            if (tile) {
                let newBounds;
                if (draggedTile.direction === null) {
                    newBounds = {
                        left: mouseX - draggedTile.left,
                        top: mouseY - draggedTile.top,
                        width: tile.position.width,
                        height: tile.position.height,
                    };
                } else {
                    const dir = draggedTile.direction;
                    const left = draggedTile.direction.includes('left');
                    const top = draggedTile.direction.includes('top');
                    const right = draggedTile.direction.includes('right');
                    const bottom = draggedTile.direction.includes('bottom');
                    newBounds = {
                        left: left ? mouseX : tile.position.left,
                        top: top ? mouseY : tile.position.top,
                        width: left
                            ? tile.position.width +
                              (tile.position.left - mouseX)
                            : right
                            ? mouseX - tile.position.left
                            : tile.position.width,
                        height: top
                            ? tile.position.height +
                              (tile.position.top - mouseY)
                            : bottom
                            ? mouseY - tile.position.top
                            : tile.position.height,
                    };
                }
                if (newBounds) {
                    layout = layout.withTilePosition(tile, newBounds);

                    // Scroll tile into view if out
                    await tick();
                    if (draggedTile) scrollToTileView(draggedTile.id);
                }
            }
        }
    }

    function scrollToTileView(id: string) {
        const view = document.querySelector(`.tile[data-id=${id}]`);
        if (view) {
            const canvasRect = canvas.getBoundingClientRect();
            const tileRect = view.getBoundingClientRect();
            const threshold = 50;
            if (tileRect.right > canvasRect.right + threshold)
                canvas.scrollLeft = canvas.scrollLeft + threshold / 2;
            if (tileRect.bottom > canvasRect.bottom + threshold)
                canvas.scrollTop = canvas.scrollTop + threshold / 2;
            if (tileRect.left < canvasRect.left - threshold)
                canvas.scrollLeft = canvas.scrollLeft - threshold / 2;
            if (tileRect.top < canvasRect.top - threshold)
                canvas.scrollTop = canvas.scrollTop - threshold / 2;
        }
    }

    function handleMouseUp() {
        dragged.set(undefined);
        draggedTile = undefined;
    }

    function resizeTile(
        id: string,
        direction: ResizeDirection,
        left: number,
        top: number
    ) {
        draggedTile = {
            id,
            left,
            top,
            direction,
        };
    }

    function repositionAnnotations() {
        conflictsOfInterest = new Map(conflictsOfInterest);
    }

    function getSourceByID(id: string) {
        return project.getSources()[parseInt(id.replace('source', ''))];
    }
</script>

<svelte:window
    on:blur={() => (draggedTile = undefined)}
    on:mouseup={() => (draggedTile = undefined)}
/>

<!-- Render the app header and the current project, if there is one. -->
<main
    class="project"
    on:keydown={(event) =>
        event.key === 'Escape' ? (fullscreen = false) : undefined}
    transition:fade={{ duration: 200 }}
>
    <div
        class="canvas"
        on:mousedown={handleMouseDown}
        on:mouseup={handleMouseUp}
        on:mousemove={handleMouseMove}
        on:transitionend={repositionAnnotations}
        bind:clientWidth={canvasWidth}
        bind:clientHeight={canvasHeight}
        bind:this={canvas}
    >
        {#if layout.arrangement === Arrangement.free}
            <div
                class="boundary"
                style:left="{maxRight}px"
                style:top="{maxBottom}px"
                style:position="absolute">&nbsp;</div
            >
        {/if}

        {#each layout.tiles as tile (tile.id)}
            <TileView
                {tile}
                arrangement={layout.arrangement}
                background={tile.kind === Content.Output
                    ? outputBackground
                    : null}
                dragging={draggedTile?.id === tile.id}
                fullscreenID={layout.fullscreenID}
                on:mode={(event) => setMode(tile, event.detail.mode)}
                on:position={(event) =>
                    positionTile(tile, event.detail.position)}
                on:resize={(event) =>
                    resizeTile(
                        event.detail.id,
                        event.detail.direction,
                        event.detail.left,
                        event.detail.top
                    )}
                on:scroll={repositionAnnotations}
                on:fullscreen={(event) =>
                    setFullscreen(tile, event.detail.fullscreen)}
            >
                {#if tile.kind === Content.Documentation}
                    <Documentation hidden={stepping} />
                {:else if tile.kind === Content.Palette}
                    <OutputEditor {project} />
                {:else if tile.kind === Content.Output}
                    <OutputView
                        {project}
                        source={project.main}
                        {latest}
                        mode={fullscreen ? 'fullscreen' : 'peripheral'}
                        bind:background={outputBackground}
                    />
                {:else}
                    <Editor
                        {project}
                        source={getSourceByID(tile.id)}
                        on:conflicts={(event) =>
                            (conflictsOfInterest = conflictsOfInterest.set(
                                event.detail.source,
                                event.detail.conflicts
                            ))}
                    />
                {/if}</TileView
            >
        {/each}
    </div>
    <!-- Render the footer on top of the windows -->
    <div class="footer">
        {#each layout.getSources() as source}
            <MiniSourceView
                {project}
                source={getSourceByID(source.id)}
                on:toggle={() =>
                    setMode(
                        source,
                        source.mode === Mode.Expanded
                            ? Mode.Collapsed
                            : Mode.Expanded
                    )}
            />
        {/each}
        {#each layout.getNonSources() as tile}
            <NonSourceTileToggle
                {tile}
                on:toggle={() =>
                    setMode(
                        tile,
                        tile.mode === Mode.Expanded
                            ? Mode.Collapsed
                            : Mode.Expanded
                    )}
            />
        {/each}
        <div class="settings">
            <Timeline evaluator={project.evaluator} />
            <Button
                tip={layout.arrangement === Arrangement.free
                    ? $preferredTranslations[0].ui.tooltip.vertical
                    : layout.arrangement === Arrangement.vertical
                    ? $preferredTranslations[0].ui.tooltip.horizontal
                    : $preferredTranslations[0].ui.tooltip.freeform}
                chromeless
                action={() =>
                    (layout = layout.withNextArrangement(
                        canvasWidth,
                        canvasHeight
                    ))}
                >{#if layout.arrangement === Arrangement.vertical}↕️{:else if layout.arrangement === Arrangement.horizontal}↔️{:else if layout.arrangement === Arrangement.free}█{/if}</Button
            >
            <Language />
            <Button
                tip={$preferredTranslations[0].ui.tooltip.close}
                action={() => updateProject(undefined)}
                chromeless>❌</Button
            >
        </div>
    </div>
    <!-- Render annotations on top of the tiles and the footer -->
    <Annotations {project} conflicts={visibleConflicts} {stepping} />

    <!-- Render the dragged node over the whole project -->
    {#if $dragged !== undefined}
        <!-- Render the highlight underneath the code -->
        <div class="drag-outline">
            {#if outline}<Highlight {...outline} above={false} />{/if}
        </div>
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
</main>

<style>
    .project {
        width: 100vw;
        height: 100vh;
        background-color: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .canvas {
        flex: 1;
        overflow: scroll;
    }

    .footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        border-top: 1px solid var(--wordplay-border-color);
    }

    .settings {
        margin-left: auto;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-width: 5em;
    }

    .drag-outline {
        z-index: 2;
    }
    .drag-container {
        position: absolute;
        cursor: none;
        pointer-events: none;
        z-index: 2;
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
