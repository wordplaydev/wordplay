<script lang="ts">
    /**
     * A grid of colors, drawn as one output.
     *
     * The point of this view is what it *doesn't* build. The same picture written as a
     * `Grid` of `Phrase`s costs a `PhraseView` per cell — a canvas `measureText`, thirteen
     * reactive style bindings and an animation slot each, rebuilt whenever the program
     * re-evaluates — which is why the camera example that does it by hand warns creators
     * to keep their grids small. Here a picture with no glyphs is a single `<canvas>`
     * scaled up by CSS, and one with glyphs is a plain span per cell with no measuring,
     * no poses and no physics of its own. An image moves, animates and collides as one
     * thing, which is the trade that buys all of that.
     */
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import moveOutputWithKey from '@components/output/keyboardMove';
    import {
        getAnnouncer,
        getProject,
        getSelectedOutput,
        getStageGrid,
        getStageScene,
    } from '@components/project/Contexts';
    import { DB, locales } from '@db/Database';
    import Evaluate from '@nodes/Evaluate';
    import type Image from '@output/Output/Image';
    import {
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        PX_PER_METER,
        toOutputTransform,
    } from '@output/Output/outputToCSS';
    import type Place from '@output/Place/Place';
    import type RenderContext from '@output/RenderContext';
    import { untrack } from 'svelte';

    interface Props {
        image: Image;
        place: Place;
        focus: Place;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        /** Whether the creator can select this output for inspection (edit or debug mode). */
        inspectable?: boolean;
        editing: boolean;
        frame: number;
        /** Render flat (screen-fixed, no perspective/z) — used by the overlay/HUD layer. */
        flat?: boolean;
    }

    let {
        image,
        place,
        focus,
        interactive,
        parentAscent,
        context,
        editable,
        inspectable = editable,
        editing,
        frame,
        flat = false,
    }: Props = $props();

    const selection = getSelectedOutput();
    const project = getProject();
    const announce = getAnnouncer();
    const grid = getStageGrid();
    const stageScene = getStageScene();

    let visible = $derived(flat || place.z > focus.z);
    let selectable = $derived(image.selectable);

    let columns = $derived(image.getColumns());
    let rows = $derived(image.getRows());
    let width = $derived(image.width * PX_PER_METER);
    let height = $derived(image.height * PX_PER_METER);

    /**
     * A color of its own means every glyph is drawn in it, rather than in the color of the
     * square it stands for. Without one each glyph takes its square's color, which is the
     * only reading that makes sense for a picture drawn in letters; with one, the glyphs
     * carry shape alone, which is what shading with them needs. It says nothing about a
     * picture with no glyphs, whose squares are its colors.
     */
    let uniform = $derived(
        image.getDefaultPose()?.color?.toCSS(context.adapting),
    );

    /** Every cell, flattened, for the glyph path. Short rows leave their tail unpainted. */
    let cells = $derived(
        image.glyphs === undefined
            ? []
            : image.colors.flatMap((row, y) =>
                  row.map((color, x) => ({
                      x,
                      y,
                      color: uniform ?? color.toCSS(context.adapting),
                      glyph: image.glyphs?.[y]?.[x] ?? '',
                  })),
              ),
    );

    let canvas = $state<HTMLCanvasElement | undefined>(undefined);

    /**
     * Paint one square per color at the grid's own size, then let CSS scale it up.
     *
     * `fillStyle` takes the same `lch()` string the rest of output uses, so the adaptation
     * a dark canvas asks for is applied exactly where every other color applies it, rather
     * than being converted to bytes here and drifting.
     */
    $effect(() => {
        const element = canvas;
        const grid = image.colors;
        const adapting = context.adapting;
        if (element === undefined || image.glyphs !== undefined) return;
        const ctx = element.getContext('2d');
        if (ctx === null) return;
        ctx.clearRect(0, 0, element.width, element.height);
        for (const [y, row] of grid.entries())
            for (const [x, color] of row.entries()) {
                ctx.fillStyle = color.toCSS(adapting);
                ctx.fillRect(x, y, 1, 1);
            }
    });

    let selected = $derived(
        inspectable &&
            editing &&
            image.value.creator instanceof Evaluate &&
            $project !== undefined &&
            selection?.includes(image.value.creator, $project),
    );

    let soleSelected = $derived(
        selected === true &&
            $project !== undefined &&
            selection?.getOutput($project).length === 1,
    );

    let view = $state<HTMLDivElement | undefined>(undefined);

    let creator = $derived(
        image.value.creator instanceof Evaluate
            ? image.value.creator
            : undefined,
    );

    $effect(() => {
        if (soleSelected && selection?.shouldTakeFocus() && view)
            setKeyboardFocus(view, 'Focused on selected image.');
    });

    function handleKeyDown(event: KeyboardEvent) {
        if (
            !selected ||
            !editable ||
            event.altKey ||
            $project === undefined ||
            creator === undefined
        )
            return;
        moveOutputWithKey(event, {
            db: DB,
            project: $project,
            creator,
            output: image,
            locales: $locales,
            scene: $stageScene,
            grid: $grid ?? false,
            selection,
            announce: $announce,
        });
    }

    let description: string | null = $state(null);
    let lastFrame = $state(0);
    // Only update the description if the frame has changed.
    $effect(() => {
        if (frame > untrack(() => lastFrame))
            description = image.getDescription($locales);
        lastFrame = frame;
    });
</script>

{#if visible}
    <!-- role is required for aria-label to be legal ARIA on a div, exactly as for a
         phrase or a shape; without one axe throws the description away. -->
    <div
        bind:this={view}
        role={selectable ? 'button' : 'img'}
        aria-disabled={!selectable}
        aria-label={description}
        aria-pressed={selectable && editing && inspectable ? selected : null}
        class="output image"
        class:selected
        tabIndex={interactive && (selectable || editing) ? 0 : null}
        onkeydown={interactive ? handleKeyDown : null}
        data-id={image.getHTMLID()}
        data-node-id={image.value.creator.id}
        data-name={image.getName()}
        data-selectable={selectable}
        style:font-family={getFaceCSS(context.face)}
        style:background={image.background?.toCSS(context.adapting) ?? null}
        style:color={getColorCSS(
            image.getFirstRestPose(),
            image.pose,
            context.adapting,
        )}
        style:opacity={getOpacityCSS(image.getFirstRestPose(), image.pose)}
        style:width="{width}px"
        style:height="{height}px"
        style:transform={toOutputTransform(
            image.getFirstRestPose(),
            image.pose,
            place,
            focus,
            parentAscent,
            { width, height, ascent: height, descent: 0 },
            undefined,
            flat,
        )}
    >
        {#if image.glyphs === undefined}
            <canvas
                bind:this={canvas}
                width={Math.max(1, columns)}
                height={Math.max(1, rows)}
                aria-hidden="true"
            ></canvas>
        {:else}
            <!-- A span per cell rather than a phrase per cell. No measuring: every cell is
                 the same fraction of the picture, so the grid does the arithmetic. -->
            <div
                class="glyphs"
                aria-hidden="true"
                style:grid-template-columns="repeat({Math.max(1, columns)}, 1fr)"
                style:font-size="{height / Math.max(1, rows)}px"
            >
                {#each cells as cell (`${cell.x},${cell.y}`)}
                    <span
                        style:grid-column={cell.x + 1}
                        style:grid-row={cell.y + 1}
                        style:color={cell.color}>{cell.glyph}</span
                    >
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .image {
        position: absolute;
        /* physical: the output coordinate space's origin, which a transform then places from. */
        left: 0;
        top: 0;
        transform-origin: 0 0;
    }

    canvas {
        width: 100%;
        height: 100%;
        display: block;
        /* A color is a square, not a sample to smooth between: the whole point is that a
           creator can see and address the cells they wrote. */
        image-rendering: pixelated;
    }

    .glyphs {
        display: grid;
        width: 100%;
        height: 100%;
    }

    .glyphs span {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        overflow: hidden;
    }

    .selected {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
    }
</style>
