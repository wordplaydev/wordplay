<script context="module" lang="ts">
    export type ResizeDirection =
        | 'top'
        | 'top-left'
        | 'left'
        | 'bottom-left'
        | 'bottom'
        | 'bottom-right'
        | 'right'
        | 'top-right';
</script>

<!-- A component that renders an arbitrary component and whose size is set by the project. -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { preferredTranslations } from '../translation/translations';
    import Button from './Button.svelte';
    import type { Arrangement } from './Layout';
    import type Tile from './Tile';
    import { Mode } from './Tile';
    import { playing } from '../models/stores';

    export let tile: Tile;
    export let arrangement: Arrangement;
    export let dragging: boolean;
    export let fullscreenID: string | undefined;
    export let background: string | null = null;

    $: fullscreen = tile.id === fullscreenID;

    let view: HTMLElement | undefined;
    let resizeDirection: ResizeDirection | null = null;

    const dispatch = createEventDispatcher();

    function handleKeyDown(event: KeyboardEvent) {
        // Collapse on escape
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            tile.mode === Mode.Expanded
        )
            dispatch('mode', { mode: Mode.Collapsed });
        // Move or resize on command-arrow
        else if (
            arrangement &&
            (event.metaKey || event.ctrlKey) &&
            event.key.startsWith('Arrow')
        ) {
            const increment = 50;
            const resize = event.shiftKey;
            const horizontal =
                event.key === 'ArrowLeft'
                    ? -1
                    : event.key === 'ArrowRight'
                    ? 1
                    : 0;
            const vertical =
                event.key === 'ArrowUp'
                    ? -1
                    : event.key === 'ArrowDown'
                    ? 1
                    : 0;
            if (horizontal !== 0)
                dispatch('position', {
                    position: resize
                        ? {
                              left: tile.position.left,
                              top: tile.position.top,
                              width: Math.max(
                                  100,
                                  tile.position.width + increment * horizontal
                              ),
                              height: tile.position.height,
                          }
                        : {
                              left: Math.max(
                                  0,
                                  tile.position.left + increment * horizontal
                              ),
                              top: tile.position.top,
                              width: tile.position.width,
                              height: tile.position.height,
                          },
                });
            if (vertical !== 0)
                dispatch('position', {
                    position: resize
                        ? {
                              left: tile.position.left,
                              top: tile.position.top,
                              width: tile.position.width,
                              height: Math.max(
                                  100,
                                  tile.position.height + increment * vertical
                              ),
                          }
                        : {
                              left: tile.position.left,
                              top: Math.max(
                                  0,
                                  tile.position.top + increment * vertical
                              ),
                              width: tile.position.width,
                              height: tile.position.height,
                          },
                });
            return;
        }
    }

    function handleMouseDown(event: MouseEvent) {
        if (resizeDirection !== null && view) {
            const rect = view.getBoundingClientRect();
            dispatch('resize', {
                id: tile.id,
                direction: resizeDirection,
                left: event.clientX - rect.left,
                top: event.clientY - rect.top,
            });
            event.stopPropagation();
        }
    }

    function handleMouseMove(event: MouseEvent) {
        if (view === undefined) return;

        if (event.buttons === 0) {
            const x = event.clientX;
            const y = event.clientY;
            const rect = view.getBoundingClientRect();
            const threshold = 20;
            const containsLeft = x < rect.left + threshold;
            const containsRight = x > rect.right - threshold;
            const containsTop = y < rect.top + threshold;
            const containsBottom = y > rect.bottom - threshold;

            resizeDirection =
                containsLeft && containsTop
                    ? 'top-left'
                    : containsLeft && containsBottom
                    ? 'bottom-left'
                    : containsRight && containsTop
                    ? 'top-right'
                    : containsRight && containsBottom
                    ? 'bottom-right'
                    : containsLeft
                    ? 'left'
                    : containsRight
                    ? 'right'
                    : containsTop
                    ? 'top'
                    : containsBottom
                    ? 'bottom'
                    : null;
        }
    }
</script>

{#if tile.mode === Mode.Expanded && (fullscreenID === undefined || fullscreenID === tile.id)}
    <section
        class="tile {resizeDirection
            ? `resize-${resizeDirection}`
            : ''} {arrangement} {tile.id}"
        class:fullscreen
        class:dragging
        class:stepping={!$playing}
        data-id={tile.id}
        style:background
        style:left={fullscreen ? null : `${tile.bounds?.left ?? 0}px`}
        style:top={fullscreen ? null : `${tile.bounds?.top ?? 0}px`}
        style:width={fullscreen ? null : `${tile.bounds?.width ?? 0}px`}
        style:height={fullscreen ? null : `${tile.bounds?.height ?? 0}px`}
        transition:fade={{ duration: 200 }}
        on:mousemove={handleMouseMove}
        on:mouseleave={() => (resizeDirection = null)}
        on:mousedown={handleMouseDown}
        on:keydown={handleKeyDown}
        bind:this={view}
    >
        <!-- Render the toolbar -->
        <div class="controls">
            <span class="name">{tile.name}</span>
            <Button
                tip={$preferredTranslations[0].ui.tooltip.collapse}
                action={() => dispatch('mode', { mode: Mode.Collapsed })}
                chromeless>&ndash;</Button
            >
            <Button
                tip={$preferredTranslations[0].ui.tooltip.fullscreen}
                action={() =>
                    dispatch('fullscreen', {
                        fullscreen: !fullscreen,
                    })}
                chromeless
            >
                <svg height="13px" viewBox="0 0 14 14" width="14px"
                    ><title /><desc /><defs /><g
                        fill-rule="evenodd"
                        stroke-width="1"
                        ><g transform="translate(-215.000000, -257.000000)"
                            ><g transform="translate(215.000000, 257.000000)"
                                ><path
                                    d="M2,9 L0,9 L0,14 L5,14 L5,12 L2,12 L2,9 L2,9 Z M0,5 L2,5 L2,2 L5,2 L5,0 L0,0 L0,5 L0,5 Z M12,12 L9,12 L9,14 L14,14 L14,9 L12,9 L12,12 L12,12 Z M9,0 L9,2 L12,2 L12,5 L14,5 L14,0 L9,0 L9,0 Z"
                                    id="Shape"
                                /></g
                            ></g
                        ></g
                    ></svg
                >
            </Button>
        </div>
        <!-- Render the content -->
        <div class="content" on:scroll={() => dispatch('scroll')}>
            <slot />
        </div>
    </section>
{/if}

<style>
    .tile {
        position: absolute;
        background: var(--wordplay-background);
        transition: left 0.1s ease-out, top 0.1s ease-out, width 0.1s ease-out,
            height 0.1s ease-out;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    .tile.resize-top-left {
        cursor: nw-resize;
    }
    .tile.resize-top {
        cursor: n-resize;
    }
    .tile.resize-top-right {
        cursor: ne-resize;
    }
    .tile.resize-left {
        cursor: w-resize;
    }
    .tile.resize-right {
        cursor: e-resize;
    }
    .tile.resize-bottom-right {
        cursor: se-resize;
    }
    .tile.resize-bottom-left {
        cursor: sw-resize;
    }
    .tile.resize-bottom {
        cursor: s-resize;
    }

    .tile.free {
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-color) solid 1px;
    }

    .tile.vertical:not(:last-child) {
        border-bottom: var(--wordplay-border-color) solid 1px;
    }

    .tile.vertical.docs,
    .tile.vertical.palette {
        border-right: var(--wordplay-border-color) solid 1px;
    }

    .tile.horizontal:not(:last-child) {
        border-right: var(--wordplay-border-color) solid 1px;
    }

    .dragging {
        transition: none;
    }

    .name {
        color: var(--wordplay-disabled-color);
    }

    .controls {
        position: relative;
        align-self: end;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: var(--wordplay-spacing);
        color: var(--wordplay-disabled-color);
        fill: var(--wordplay-disabled-color);
        gap: var(--wordplay-spacing);
    }

    .content {
        overflow: scroll;
        scroll-behavior: smooth;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .tile:focus-within {
        z-index: 1;
    }

    .tile:focus-within:after {
        width: 100%;
        height: 100%;
        content: '';
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }

    .tile.stepping:focus-within:after {
        outline-color: var(--wordplay-evaluation-color);
    }

    .fullscreen {
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }
</style>
