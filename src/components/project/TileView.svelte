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
    const AUTO_SCROLL_THRESHOLD = 20;
</script>

<!-- A component that renders an arbitrary component and whose size is set by the project. -->
<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import type Bounds from '@components/project/Bounds';
    import FullscreenIcon from '@components/project/FullscreenIcon.svelte';
    import type Layout from '@components/project/Layout';
    import type Tile from '@components/project/Tile';
    import { TileMode } from '@components/project/Tile';
    import TileKinds from '@components/project/TileKinds';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { animationDuration, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        Arrangement,
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import Color from '@output/Color/Color';
    import { isName } from '@parser/Tokenizer';
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import Characters from '../../lore/BasisCharacters';
    import TileMessage from './TileMessage.svelte';

    interface Props {
        project: Project;
        tile: Tile;
        layout: Layout;
        arrangement: ArrangementType;
        dragging: boolean;
        fullscreenID: string | undefined;
        background?: Color | string | null;
        /** Optional CSS background for the tile's header/toolbar row (e.g., the
         *  evaluation color while stepping, to make the mode change clear). */
        headerBackground?: string | null;
        focuscontent?: boolean;
        editable: boolean;
        animated: boolean;
        title: Snippet;
        content: Snippet;
        /** Optional content rendered immediately after the tile's
         * `<Subheader>` — typically a tour-launch button. Kept separate
         * from `extra` so tour triggers have a consistent home next to
         * the tile name rather than mixed in with the toolbar. */
        help?: Snippet;
        extra?: Snippet;
        /** Optional second toolbar row below the header, sharing its coloring —
         *  for controls that don't fit the main row (e.g. stepping controls). */
        subtoolbar?: Snippet | undefined;
        /** Optional content rendered on the inline-start side of the tile's
         *  main area (e.g. the blocks-mode Wellspring). Symmetric to `margin`,
         *  which renders on the inline-end side. */
        startMargin?: Snippet;
        margin?: Snippet;
        /** Optional non-scrolling content rendered directly below the scroll
         *  viewport (not the full tile footer), so it shrinks the viewport and
         *  stays visible without floating over the scrolling content — used for
         *  the editor's notification band. */
        contentFooter?: Snippet;
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
        setMode: (mode: TileMode) => void;
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
        headerBackground = null,
        focuscontent = false,
        editable,
        animated,
        title,
        help,
        extra,
        subtoolbar,
        content,
        startMargin,
        margin,
        contentFooter,
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

    let contentView = $state<HTMLElement | null>(null);
    let tileWidth = $state(0);
    let tileHeight = $state(0);

    // The toolbar's middle grid column (1fr) auto-shrinks via min-width:0,
    // and OverflowToolbar compacts its contents to fit. No stacking needed
    // since toolbars stay on one row even on narrow screens.

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

    function handleContentPointerMove(event: PointerEvent) {
        if (event.buttons === 1 && contentView) {
            const rect = contentView.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (x < AUTO_SCROLL_THRESHOLD) {
                contentView.scrollLeft -= -AUTO_SCROLL_THRESHOLD;
            } else if (x > tileWidth - AUTO_SCROLL_THRESHOLD) {
                contentView.scrollLeft += AUTO_SCROLL_THRESHOLD;
            } else if (y < AUTO_SCROLL_THRESHOLD) {
                contentView.scrollTop -= AUTO_SCROLL_THRESHOLD;
            } else if (y > tileHeight - AUTO_SCROLL_THRESHOLD) {
                contentView.scrollTop += AUTO_SCROLL_THRESHOLD;
            }
        }
    }

    function handleRename(name: string) {
        rename(tile.id, name);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
    class="tile {resizeDirection
        ? `resize-${resizeDirection}`
        : ''} {arrangement} {tile.id} {tile.id.startsWith('source')
        ? 'editor-viewport'
        : ''}"
    class:arrangement
    onpointermove={handlePointerMove}
    onpointerleave={() => (resizeDirection = null)}
    onpointerdown={handlePointerDown}
    onkeydown={handleKeyDown}
    class:fullscreen
    class:dragging
    class:focuscontent
    class:animated={mounted && animated && !dragging}
    data-id={tile.id}
    data-testid="tile-{tile.id}"
    style:background={background instanceof Color
        ? background.toCSS()
        : background}
    style:left={fullscreen
        ? null
        : `${
              arrangement === Arrangement.Free
                  ? tile.position.left
                  : (tile.bounds?.left ?? 0)
          }px`}
    style:top={fullscreen
        ? null
        : `${
              arrangement === Arrangement.Free
                  ? tile.position.top
                  : (tile.bounds?.top ?? 0)
          }px`}
    style:width={fullscreen
        ? null
        : `${
              arrangement === Arrangement.Free
                  ? tile.position.width
                  : (tile.bounds?.width ?? 0)
          }px`}
    style:height={fullscreen
        ? null
        : `${
              arrangement === Arrangement.Free
                  ? tile.position.height
                  : (tile.bounds?.height ?? 0)
          }px`}
    bind:this={view}
>
    <svelte:boundary
        onerror={(error) => {
            if (error instanceof Error) console.error(error.stack);
            else console.error(error);
        }}
    >
        {#snippet failed(error, reset)}
            <TileMessage error>
                <h2><LocalizedText path={(l) => l.ui.project.error.tile} /></h2>
                <p
                    ><Button
                        tip={(l) => l.ui.project.error.reset}
                        action={reset}
                        background
                        ><LocalizedText
                            path={(l) => l.ui.project.error.reset}
                        /></Button
                    ></p
                >
                <Note>{'' + error}</Note>
            </TileMessage>
        {/snippet}

        {#if !tile.isInvisible() || fullscreen}
            <!-- Render the toolbar -->
            <div
                class="header"
                style:color={headerBackground !== null
                    ? 'var(--wordplay-background)'
                    : foreground}
                style:fill={headerBackground !== null
                    ? 'var(--wordplay-background)'
                    : foreground}
                style:background-color={headerBackground}
            >
                <!-- This goes above the toolbar because we need the feedback to be visible. -->
                <div class="name-section" style="z-index:2">
                    <Subheader compact>
                        <div class="name" class:source={tile.isSource()}>
                            {#if editable && tile.isSource()}
                                <Emoji text={Characters.Program.symbols} />
                                {#if project.getSources().length > 1}
                                    <!-- Only show the source name editor if there's more than one source, to simplify. -->
                                    <TextField
                                        id="source-name-editor-{tile.id}"
                                        text={tile
                                            .getSource(project)
                                            ?.getPreferredName(
                                                $locales.getLocales(),
                                            ) ?? ''}
                                        description={(l) =>
                                            l.ui.source.field.name.description}
                                        placeholder={(l) =>
                                            l.ui.source.field.name.placeholder}
                                        validator={(text) =>
                                            !isName(text)
                                                ? (l) =>
                                                      l.ui.source.error
                                                          .invalidName
                                                : true}
                                        inlineValidation
                                        changed={handleRename}
                                    />
                                {:else}
                                    <LocalizedText
                                        path={(l) => l.ui.source.title}
                                    />
                                {/if}
                            {:else}
                                <Emoji
                                    text={TileKinds[tile.kind].symbol}
                                />{#if tile.isSource()}{tile.getName(
                                        project,
                                        $locales,
                                    )}{:else}<LocalizedText
                                        path={(l) => l.ui.tile.label}
                                        extras={[tile.kind]}
                                    />{/if}
                            {/if}
                            {@render title()}
                        </div>
                    </Subheader>
                    {#if help}{@render help()}{/if}
                </div>
                {#if extra}
                    <div class="toolbar">
                        {@render extra()}
                    </div>
                {/if}
                <div class="tile-controls">
                    {#if !layout.isFullscreen()}
                        <Button
                            background={false}
                            tip={(l) => l.ui.tile.button.collapse}
                            action={() => mode(TileMode.Collapsed)}
                            icon="–"
                        ></Button>
                    {/if}
                    <Toggle
                        tips={(l) => l.ui.tile.toggle.fullscreen}
                        on={fullscreen}
                        toggle={() => setFullscreen(!fullscreen)}
                    >
                        <FullscreenIcon />
                    </Toggle>
                </div>
            </div>
            {#if subtoolbar}
                <div
                    class="subtoolbar"
                    style:color={headerBackground !== null
                        ? 'var(--wordplay-background)'
                        : foreground}
                    style:fill={headerBackground !== null
                        ? 'var(--wordplay-background)'
                        : foreground}
                    style:background-color={headerBackground}
                >
                    {@render subtoolbar()}
                </div>
            {/if}
            <!-- Render the content -->
            <div class="main" class:rtl={$locales.getDirection() === 'rtl'}>
                {#if startMargin}
                    <div class="start-margin">{@render startMargin()}</div>
                {/if}
                <!-- The scroll viewport and its non-scrolling content footer share a
                     column so the footer shrinks the viewport rather than floating
                     over it (keeping the caret and nodes visible when scrolling). -->
                <div class="content-column">
                    <div
                        class="content"
                        onscroll={() => scroll()}
                        bind:this={contentView}
                        bind:clientWidth={tileWidth}
                        bind:clientHeight={tileHeight}
                        onpointermove={handleContentPointerMove}
                    >
                        {@render content()}
                    </div>
                    {#if contentFooter}
                        <div class="content-footer">{@render contentFooter()}</div>
                    {/if}
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
        {/if}
    </svelte:boundary>
</section>

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
        grid-area: toolbar;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-width: 0;
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
        overflow: hidden;
    }

    .main.rtl {
        flex-direction: row-reverse;
    }

    /* Holds the scroll viewport plus its non-scrolling content footer, so the
       footer takes real space below a shorter viewport instead of floating. */
    .content-column {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
    }

    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: auto;
        width: 100%;
        flex-grow: 1;
        /* Must be 0 (not auto) so the flex item can shrink below its content and
           actually scroll now that it sizes by flex-grow within the column. */
        min-height: 0;
        /* This doesn't work in Chrome :( It prevents scrolling altogether */
        /* scroll-behavior: smooth; */
    }

    .content-footer {
        width: 100%;
        flex-shrink: 0;
    }

    .margin,
    .start-margin {
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

    .tile.responsive,
    .tile.horizontal {
        border-inline-end: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
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
        transition-duration: calc(var(--animation-factor) * 100ms);
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
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: 'name toolbar controls';
        align-items: center;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        width: 100%;
        flex-shrink: 0;
        /** Dim the header a bit so that they don't demand so much attention */
        opacity: 0.8;

        border-block-end: solid var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .subtoolbar {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        width: 100%;
        flex-shrink: 0;
        opacity: 0.8;
        border-block-end: solid var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .name-section {
        grid-area: name;
        min-width: 0;
        /* Lay out the Subheader and (optional) help button inline so the tour
           trigger sits immediately to the right of the tile's name. */
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .focus-indicator {
        height: var(--wordplay-focus-width);
        flex-shrink: 0;
        width: 100%;
        /* Chrome-colored when idle so a tile's custom background (e.g. the stage color)
           doesn't show through the reserved strip. */
        background-color: var(--wordplay-background);
    }

    /* Skip the tile's focus indicator when the focused element renders its own focus
       indication (marked with data-indicates-focus, e.g. the stage chat field). */
    .main:focus-within:not(
            :has(:global([data-indicates-focus]:focus-within))
        )
        + .focus-indicator {
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
        gap: var(--wordplay-spacing-half);
        align-items: center;
    }

    .name.source {
        color: var(--wordplay-foreground);
    }

    .tile-controls {
        grid-area: controls;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
        align-items: center;
        flex-wrap: nowrap;
    }
</style>
