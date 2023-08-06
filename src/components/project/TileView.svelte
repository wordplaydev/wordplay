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
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';
    import { Mode } from './Tile';
    import type Layout from './Layout';
    import TextField from '../widgets/TextField.svelte';
    import { isName } from '../../parser/Tokenizer';
    import { config } from '../../db/Database';
    import { onMount } from 'svelte';
    import type Arrangement from '../../db/Arrangement';
    import Glyphs from '../../lore/Glyphs';
    import Color from '../../output/Color';

    export let tile: Tile;
    export let layout: Layout;
    export let arrangement: Arrangement;
    export let dragging: boolean;
    export let fullscreenID: string | undefined;
    export let background: Color | string | null = null;
    export let focuscontent: boolean = false;

    $: fullscreen = tile.id === fullscreenID;

    let view: HTMLElement | undefined;
    let resizeDirection: ResizeDirection | null = null;
    let mounted = false;
    onMount(() => (mounted = true));

    $: foreground =
        background instanceof Color ? background.complement().toCSS() : null;

    const dispatch = createEventDispatcher();

    function handleKeyDown(event: KeyboardEvent) {
        // Move or resize on command-arrow
        if ((event.metaKey || event.ctrlKey) && event.key.startsWith('Arrow')) {
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

    function handlePointerDown(event: PointerEvent) {
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

    function handlePointerMove(event: PointerEvent) {
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

    function handleRename(name: string) {
        dispatch('rename', { id: tile.id, name });
    }
</script>

<div
    role="presentation"
    on:pointermove={handlePointerMove}
    on:pointerleave={() => (resizeDirection = null)}
    on:pointerdown={handlePointerDown}
    on:keydown={handleKeyDown}
>
    <section
        class="tile {resizeDirection
            ? `resize-${resizeDirection}`
            : ''} {arrangement} {tile.id} {tile.id.startsWith('source')
            ? 'editor'
            : ''}"
        class:fullscreen
        class:dragging
        class:focuscontent
        class:animated={mounted}
        data-id={tile.id}
        style:background={background instanceof Color
            ? background.toCSS()
            : background}
        style:left={fullscreen ? null : `${tile.bounds?.left ?? 0}px`}
        style:top={fullscreen ? null : `${tile.bounds?.top ?? 0}px`}
        style:width={fullscreen ? null : `${tile.bounds?.width ?? 0}px`}
        style:height={fullscreen ? null : `${tile.bounds?.height ?? 0}px`}
        bind:this={view}
    >
        <!-- Render the toolbar -->
        <div class="header" style:color={foreground} style:fill={foreground}>
            <div class="name" class:source={tile.isSource()}>
                {#if tile.isSource()}
                    {Glyphs.Program.symbols}
                    <TextField
                        text={tile.name}
                        description={$config.getLocale().ui.description
                            .editSourceName}
                        placeholder={$config.getLocale().ui.placeholders.name}
                        validator={(text) => isName(text)}
                        changed={handleRename}
                    />
                {:else}
                    {tile.name}
                {/if}
                <slot name="name" />
            </div>
            <div class="toolbar">
                <slot name="extra" />
                <Button
                    tip={$config.getLocale().ui.description.collapse}
                    action={() => dispatch('mode', { mode: Mode.Collapsed })}
                    active={!layout.isFullscreen()}>⎵</Button
                >
                <Button
                    tip={$config.getLocale().ui.description.fullscreen}
                    action={() =>
                        dispatch('fullscreen', {
                            fullscreen: !fullscreen,
                        })}
                >
                    <svg height="13px" viewBox="0 0 14 14" width="14px"
                        ><title /><desc /><defs /><g
                            fill-rule="evenodd"
                            stroke-width="1"
                            ><g transform="translate(-215.000000, -257.000000)"
                                ><g
                                    transform="translate(215.000000, 257.000000)"
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
        </div>
        <!-- Render the content -->
        <div class="content" on:scroll={() => dispatch('scroll')}>
            <slot name="content" />
        </div>
        <div class="footer"><slot name="footer" /></div>
    </section>
</div>

<style>
    .tile {
        position: absolute;
        background: var(--wordplay-background);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
    }

    .tile.free {
        z-index: 1;
    }

    .tile.animated {
        transition: left ease-out, top ease-out, width ease-out, height ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .tile.free {
        cursor: move;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-color) solid 1px;
    }

    .tile.free.resize-top-left {
        cursor: nw-resize;
    }
    .tile.free.resize-top {
        cursor: n-resize;
    }
    .tile.free.resize-top-right {
        cursor: ne-resize;
    }
    .tile.free.resize-left {
        cursor: w-resize;
    }
    .tile.free.resize-right {
        cursor: e-resize;
    }
    .tile.free.resize-bottom-right {
        cursor: se-resize;
    }
    .tile.free.resize-bottom-left {
        cursor: sw-resize;
    }
    .tile.free.resize-bottom {
        cursor: s-resize;
    }

    .tile.horizontal.editor {
        border-right: var(--wordplay-border-color) solid 1px;
    }

    .tile.vertical:not(:last-child) {
        border-bottom: var(--wordplay-border-color) solid 1px;
    }

    .tile.horizontal.docs,
    .tile.vertical.docs,
    .tile.vertical.palette {
        border-right: var(--wordplay-border-color) solid 1px;
    }

    .tile.vertical.docs {
        border-top: var(--wordplay-border-color) solid 1px;
    }

    .tile.vertical.palette {
        border-bottom: var(--wordplay-border-color) solid 1px;
    }

    .tile.horizontal:not(:last-child) {
        border-right: var(--wordplay-border-color) solid 1px;
    }

    .tile.dragging {
        transition: none;
    }

    .header {
        position: relative;
        align-self: start;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        padding-top: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
        padding-bottom: 0;
        gap: var(--wordplay-spacing);
        width: 100%;
        min-height: 2.75em;
        overflow-x: auto;
    }

    /** Dim the header a bit so that they don't demand so much attention */
    .header {
        opacity: 0.8;
    }

    .toolbar {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        min-width: max-content;
        gap: var(--wordplay-spacing);
    }

    .footer {
        width: 100%;
        min-height: max-content;
        flex-shrink: 0;
    }

    .content {
        overflow: scroll;
        /* This doesn't work in Chrome :( It prevents scrolling altogether */
        /* scroll-behavior: smooth; */
        position: relative;
        width: 100%;
        flex-grow: 1;
    }

    .focuscontent .content:focus-within {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .focuscontent.fullscreen .content:focus-within:after {
        outline-width: calc(var(--wordplay-focus-width) / 2);
        outline-offset: calc(-1 * var(--wordplay-focus-width) / 2);
    }

    .fullscreen {
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
    }

    .name {
        margin-inline-end: auto;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .name.source {
        color: var(--wordplay-foreground);
    }
</style>
