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
    import { locales } from '../../db/Database';
    import { onMount } from 'svelte';
    import Arrangement from '../../db/Arrangement';
    import Glyphs from '../../lore/Glyphs';
    import Color from '../../output/Color';
    import Toggle from '../widgets/Toggle.svelte';
    import type Project from '../../models/Project';
    import Emoji from '@components/app/Emoji.svelte';
    import TileSymbols from './TileSymbols';
    import FullscreenIcon from './FullscreenIcon.svelte';

    export let project: Project;
    export let tile: Tile;
    export let layout: Layout;
    export let arrangement: Arrangement;
    export let dragging: boolean;
    export let fullscreenID: string | undefined;
    export let background: Color | string | null = null;
    export let focuscontent = false;
    export let editable: boolean;

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
        if (
            (event.metaKey || event.ctrlKey) &&
            event.key.startsWith('Arrow') &&
            arrangement === Arrangement.Free
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
            ? 'editor-viewport'
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
                {#if editable && tile.isSource()}
                    <Emoji>{Glyphs.Program.symbols}</Emoji>
                    <TextField
                        text={tile
                            .getSource(project)
                            ?.getPreferredName($locales.getLocales())}
                        description={$locales.get(
                            (l) => l.ui.source.field.name.description
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.source.field.name.placeholder
                        )}
                        validator={(text) => isName(text)}
                        changed={handleRename}
                    />
                {:else}
                    <Emoji>{TileSymbols[tile.kind]}</Emoji>{tile.getName(
                        project,
                        $locales
                    )}
                {/if}
                <slot name="name" />
            </div>
            <div class="toolbar">
                <slot name="extra" />
                <Toggle
                    tips={$locales.get((l) => l.ui.tile.toggle.fullscreen)}
                    on={fullscreen}
                    toggle={() =>
                        dispatch('fullscreen', {
                            fullscreen: !fullscreen,
                        })}
                >
                    <FullscreenIcon />
                </Toggle>
                {#if !layout.isFullscreen()}
                    <Button
                        tip={$locales.get((l) => l.ui.tile.button.collapse)}
                        action={() =>
                            dispatch('mode', { mode: Mode.Collapsed })}
                        >–</Button
                    >
                {/if}
            </div>
        </div>
        <!-- Render the content -->
        <div class="main" class:rtl={$locales.getDirection() === 'rtl'}>
            <div class="content" on:scroll={() => dispatch('scroll')}>
                <slot name="content" />
            </div>
            <div class="margin"><slot name="margin" /></div>
        </div>
        <!-- Render a focus indicator. We do this instead of an outline to avoid content form overlapping an inset CSS outline.  -->
        {#if focuscontent}
            <div class="focus-indicator" />
        {/if}
        <!-- Render the footer -->
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

    .main {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        flex-grow: 1;
        gap: var(--wordplay-spacing);
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
        gap: calc(var(--wordplay-spacing));
    }

    .footer {
        width: 100%;
        min-height: max-content;
        flex-shrink: 0;
    }

    .main {
        width: 100%;
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow: auto;
    }

    .main.rtl {
        flex-direction: row-reverse;
    }

    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: auto;
        width: 100%;
        flex-grow: 1;
        min-height: auto;
        /* This doesn't work in Chrome :( It prevents scrolling altogether */
        /* scroll-behavior: smooth; */
    }

    .margin {
        width: auto;
        height: 100%;
    }

    .tile.fullscreen {
        border: none !important;
    }

    .tile.responsive,
    .tile.vertical {
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .tile:not(.output).responsive,
    .tile:not(.output).horizontal {
        border-right: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .tile.free {
        z-index: 1;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
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
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        width: 100%;
        overflow-x: auto;
        flex-shrink: 0;
    }

    .focus-indicator {
        height: var(--wordplay-focus-width);
        flex-shrink: 0;
        width: 100%;
    }

    .main:focus-within + .focus-indicator {
        background-color: var(--wordplay-focus-color);
    }

    .fullscreen {
        position: absolute;
        width: 100%;
        height: 100%;
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
        align-items: center;
    }

    .name.source {
        color: var(--wordplay-foreground);
    }
</style>
