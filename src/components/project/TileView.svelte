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
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import { animationDuration, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        Arrangement,
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import Characters from '../../lore/BasisCharacters';
    import Color from '@output/Color';
    import { isName } from '@parser/Tokenizer';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Bounds from '@components/project/Bounds';
    import FullscreenIcon from '@components/project/FullscreenIcon.svelte';
    import type Layout from '@components/project/Layout';
    import type Tile from '@components/project/Tile';
    import { TileMode } from '@components/project/Tile';
    import TileKinds from '@components/project/TileKinds';

    interface Props {
        project: Project;
        tile: Tile;
        layout: Layout;
        arrangement: ArrangementType;
        dragging: boolean;
        fullscreenID: string | undefined;
        background?: Color | string | null;
        focuscontent?: boolean;
        editable: boolean;
        animated: boolean;
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
        focuscontent = false,
        editable,
        animated,
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

    let contentView = $state<HTMLElement | null>(null);
    let tileWidth = $state(0);
    let tileHeight = $state(0);

    // Refs and detection for whether the header's three sections fit inline,
    // or whether the toolbar should drop to its own row beneath the name and
    // tile-controls. Pure CSS can't express "wrap only this child to a full
    // row when content overflows" while keeping it visually centered when it
    // fits, so we measure the children's natural widths and toggle a class.
    let headerEl: HTMLElement | null = $state(null);
    let nameSectionEl: HTMLElement | null = $state(null);
    let toolbarEl: HTMLElement | null = $state(null);
    let tileControlsEl: HTMLElement | null = $state(null);
    let toolbarStacked = $state(false);

    $effect(() => {
        if (
            headerEl === null ||
            nameSectionEl === null ||
            tileControlsEl === null
        )
            return;
        const eHeader = headerEl;
        const eName = nameSectionEl;
        const eControls = tileControlsEl;
        const eToolbar = toolbarEl;

        const check = () => {
            const headerStyle = getComputedStyle(eHeader);
            const padL = parseFloat(headerStyle.paddingLeft) || 0;
            const padR = parseFloat(headerStyle.paddingRight) || 0;
            const gap =
                parseFloat(
                    headerStyle.columnGap === 'normal'
                        ? headerStyle.gap
                        : headerStyle.columnGap,
                ) || 0;

            const nameW = eName.offsetWidth;
            const controlsW = eControls.offsetWidth;

            // Sum the toolbar's children rather than reading offsetWidth on
            // the toolbar itself: in stacked mode the toolbar spans the row
            // (offsetWidth = full width), in compact mode it's the 1fr
            // column (offsetWidth = remaining space). Children are sized
            // by their content and stable across both modes.
            let toolbarW = 0;
            const toolbarChildren = eToolbar?.children ?? [];
            if (eToolbar && toolbarChildren.length > 0) {
                const tStyle = getComputedStyle(eToolbar);
                const tGap =
                    parseFloat(
                        tStyle.columnGap === 'normal'
                            ? tStyle.gap
                            : tStyle.columnGap,
                    ) || 0;
                for (let i = 0; i < toolbarChildren.length; i++) {
                    toolbarW += (toolbarChildren[i] as HTMLElement)
                        .offsetWidth;
                }
                if (toolbarChildren.length > 1)
                    toolbarW += tGap * (toolbarChildren.length - 1);
            }

            const available = eHeader.clientWidth - padL - padR;
            const gapsBetweenItems = toolbarW > 0 ? 2 : 1;
            const totalNeeded =
                nameW + toolbarW + controlsW + gap * gapsBetweenItems;

            toolbarStacked = totalNeeded > available;
        };

        const observer = new ResizeObserver(check);
        observer.observe(eHeader);
        observer.observe(eName);
        observer.observe(eControls);
        if (eToolbar) observer.observe(eToolbar);

        check();

        return () => observer.disconnect();
    });

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
    <!-- <svelte:boundary
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
        {/snippet} -->

    {#if !tile.isInvisible() || fullscreen}
        <!-- Render the toolbar -->
        <div
            class="header"
            class:stacked={toolbarStacked}
            style:color={foreground}
            style:fill={foreground}
            bind:this={headerEl}
        >
            <!-- This goes above the toolbar because we need the feedback to be visible. -->
            <div
                class="name-section"
                style="z-index:2"
                bind:this={nameSectionEl}
            >
                <Subheader compact>
                    <div class="name" class:source={tile.isSource()}>
                        {#if editable && tile.isSource()}
                            <Emoji>{Characters.Program.symbols}</Emoji>
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
                                                  l.ui.source.error.invalidName
                                            : true}
                                    inlineValidation
                                    changed={handleRename}
                                />
                            {:else}
                                {$locales.getUnannotatedText(
                                    (l) => l.ui.source.title,
                                )}
                            {/if}
                        {:else}
                            <Emoji>{TileKinds[tile.kind].symbol}</Emoji
                            >{tile.getName(project, $locales)}
                        {/if}
                        {@render title()}
                    </div>
                </Subheader>
            </div>
            {#if extra}
                <div class="toolbar" bind:this={toolbarEl}>
                    {@render extra()}
                </div>
            {/if}
            <div class="tile-controls" bind:this={tileControlsEl}>
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
        <!-- Render the content -->
        <div class="main" class:rtl={$locales.getDirection() === 'rtl'}>
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
    <!-- </svelte:boundary> -->
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
        flex-wrap: wrap;
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

    .tile.responsive,
    .tile.horizontal {
        border-right: var(--wordplay-border-width) solid
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
        align-items: baseline;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        width: 100%;
        flex-shrink: 0;
        /** Dim the header a bit so that they don't demand so much attention */
        opacity: 0.8;

        border-block-end: solid var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    /* When the three sections don't fit on one row, drop the toolbar to a
       second row spanning the full width. The 1fr middle column stays in
       place so name/controls keep their content-based widths on row 1. */
    .header.stacked {
        grid-template-areas:
            'name . controls'
            'toolbar toolbar toolbar';
    }

    .name-section {
        grid-area: name;
        min-width: 0;
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
