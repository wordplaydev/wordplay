<script module lang="ts">
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
    import type { Snippet } from 'svelte';
    import Button from '../widgets/Button.svelte';
    import type Tile from './Tile';
    import { Mode } from './Tile';
    import type Layout from './Layout';
    import TextField from '../widgets/TextField.svelte';
    import { isName } from '../../parser/Tokenizer';
    import { animationDuration, locales } from '../../db/Database';
    import { onMount } from 'svelte';
    import Arrangement from '../../db/Arrangement';
    import Glyphs from '../../lore/Glyphs';
    import Color from '../../output/Color';
    import Toggle from '../widgets/Toggle.svelte';
    import type Project from '../../models/Project';
    import Emoji from '@components/app/Emoji.svelte';
    import TileKinds from './TileKinds';
    import FullscreenIcon from './FullscreenIcon.svelte';
    import type Bounds from './Bounds';
    import Note from '@components/widgets/Note.svelte';
    import TileMessage from './TileMessage.svelte';
    import Subheader from '@components/app/Subheader.svelte';

    interface Props {
        project: Project;
        tile: Tile;
        layout: Layout;
        arrangement: Arrangement;
        dragging: boolean;
        fullscreenID: string | undefined;
        background?: Color | string | null;
        focuscontent?: boolean;
        editable: boolean;
        title: Snippet;
        content: Snippet;
        extra?: Snippet;
        margin?: Snippet;
        footer?: Snippet;
        position: (position: Bounds) => void;
        resize: (
            id: string,
            direction: ResizeDirection,
            x: number,
            y: number,
        ) => void;
        rename: (id: string, name: string) => void;
        scroll: () => void;
        setMode: (mode: Mode) => void;
        setFullscreen: (fullscreen: boolean) => void;
    }

    let {
        project,
        tile,
        layout,
        arrangement,
        dragging,
        fullscreenID,
        background = null,
        focuscontent = false,
        editable,
        title,
        extra,
        content,
        margin,
        footer,
        position,
        resize,
        rename,
        scroll,
        setMode: mode,
        setFullscreen,
    }: Props = $props();

    let fullscreen = $derived(tile.id === fullscreenID);

    let view: HTMLElement | undefined = $state();
    let resizeDirection: ResizeDirection | null = $state(null);
    let mounted = $state(false);
    onMount(() => setTimeout(() => (mounted = true), $animationDuration));

    let foreground = $derived(
        background instanceof Color ? background.contrasting().toCSS() : null,
    );

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
                position(
                    resize
                        ? {
                              left: tile.position.left,
                              top: tile.position.top,
                              width: Math.max(
                                  100,
                                  tile.position.width + increment * horizontal,
                              ),
                              height: tile.position.height,
                          }
                        : {
                              left: Math.max(
                                  0,
                                  tile.position.left + increment * horizontal,
                              ),
                              top: tile.position.top,
                              width: tile.position.width,
                              height: tile.position.height,
                          },
                );
            if (vertical !== 0)
                position(
                    resize
                        ? {
                              left: tile.position.left,
                              top: tile.position.top,
                              width: tile.position.width,
                              height: Math.max(
                                  100,
                                  tile.position.height + increment * vertical,
                              ),
                          }
                        : {
                              left: tile.position.left,
                              top: Math.max(
                                  0,
                                  tile.position.top + increment * vertical,
                              ),
                              width: tile.position.width,
                              height: tile.position.height,
                          },
                );
            return;
        }
    }

    function handlePointerDown(event: PointerEvent) {
        if (resizeDirection !== null && view) {
            const rect = view.getBoundingClientRect();
            resize(
                tile.id,
                resizeDirection,
                event.clientX - rect.left,
                event.clientY - rect.top,
            );
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
        rename(tile.id, name);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="container"
    class:arrangement
    onpointermove={handlePointerMove}
    onpointerleave={() => (resizeDirection = null)}
    onpointerdown={handlePointerDown}
    onkeydown={handleKeyDown}
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
        data-testid="tile-{tile.id}"
        style:background={background instanceof Color
            ? background.toCSS()
            : background}
        style:left={fullscreen
            ? null
            : `${
                  arrangement === 'free'
                      ? tile.position.left
                      : (tile.bounds?.left ?? 0)
              }px`}
        style:top={fullscreen
            ? null
            : `${
                  arrangement === 'free'
                      ? tile.position.top
                      : (tile.bounds?.top ?? 0)
              }px`}
        style:width={fullscreen
            ? null
            : `${
                  arrangement === 'free'
                      ? tile.position.width
                      : (tile.bounds?.width ?? 0)
              }px`}
        style:height={fullscreen
            ? null
            : `${
                  arrangement === 'free'
                      ? tile.position.height
                      : (tile.bounds?.height ?? 0)
              }px`}
        bind:this={view}
    >
        <svelte:boundary>
            {#snippet failed(error, reset)}
                <TileMessage error>
                    <h2>{$locales.get((l) => l.ui.project.error.tile)}</h2>
                    <p
                        ><Button tip="Reset" action={reset} background
                            >{$locales.get(
                                (l) => l.ui.project.error.reset,
                            )}</Button
                        ></p
                    >
                    <Note>{'' + error}</Note>
                </TileMessage>
            {/snippet}

            <!-- Render the toolbar -->
            <div
                class="header"
                style:color={foreground}
                style:fill={foreground}
            >
                {#if !layout.isFullscreen()}
                    <Button
                        background={background !== null}
                        padding={false}
                        tip={$locales.get((l) => l.ui.tile.button.collapse)}
                        action={() => mode(Mode.Collapsed)}>–</Button
                    >
                {/if}
                <Toggle
                    tips={$locales.get((l) => l.ui.tile.toggle.fullscreen)}
                    on={fullscreen}
                    background={background !== null}
                    toggle={() => setFullscreen(!fullscreen)}
                >
                    <FullscreenIcon />
                </Toggle>
                <Subheader compact>
                    <div class="name" class:source={tile.isSource()}>
                        {#if editable && tile.isSource()}
                            <Emoji>{Glyphs.Program.symbols}</Emoji>
                            <TextField
                                text={tile
                                    .getSource(project)
                                    ?.getPreferredName($locales.getLocales())}
                                description={$locales.get(
                                    (l) => l.ui.source.field.name.description,
                                )}
                                placeholder={$locales.get(
                                    (l) => l.ui.source.field.name.placeholder,
                                )}
                                validator={(text) => isName(text)}
                                changed={handleRename}
                            />
                        {:else}
                            <Emoji>{TileKinds[tile.kind].symbol}</Emoji
                            >{tile.getName(project, $locales)}
                        {/if}
                        {@render title()}
                    </div>
                </Subheader>
                <div class="toolbar">
                    {@render extra?.()}
                </div>
            </div>
            <!-- Render the content -->
            <div class="main" class:rtl={$locales.getDirection() === 'rtl'}>
                <div class="content" onscroll={() => scroll()}>
                    {@render content()}
                </div>
                {#if margin}
                    <div class="margin">{@render margin()}</div>
                {/if}
            </div>
            <!-- Render a focus indicator. We do this instead of an outline to avoid content form overlapping an inset CSS outline.  -->
            {#if focuscontent}
                <div class="focus-indicator"></div>
            {/if}
            <!-- Render the footer -->
            <div class="footer">{@render footer?.()}</div>
        </svelte:boundary>
    </section>
</div>

<style>
    .container.free {
        position: relative;
        display: block;
    }

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

    .tile:not(:global(.output)).responsive,
    .tile:not(:global(.output)).horizontal {
        border-right: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .tile.free {
        z-index: 1;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .tile.animated {
        transition:
            left ease-out,
            top ease-out,
            width ease-out,
            height ease-out;
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
        gap: calc(var(--wordplay-spacing) / 2);
        width: 100%;
        overflow-x: auto;
        flex-shrink: 0;
        /** Dim the header a bit so that they don't demand so much attention */
        opacity: 0.8;
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
