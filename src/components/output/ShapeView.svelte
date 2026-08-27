<script module lang="ts">
    /** The most glyphs a shape will draw along its outline. A long path drawn with one narrow
     *  glyph would otherwise build a string long enough to stall the frame, for characters that
     *  fall off the end of the path anyway. */
    export const MaxGlyphRun = 2000;
</script>

<script lang="ts">
    import getTextMetrics from '@output/Output/getTextMetrics';
    import {
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
        PX_PER_METER,
        toOutputTransform,
    } from '@output/Output/outputToCSS';
    import type Place from '@output/Place/Place';
    import type RenderContext from '@output/RenderContext';
    import { untrack } from 'svelte';
    import { DB, locales } from '@db/Database';
    import { Circle } from '@output/Output/Shape/Circle';
    import { Path } from '@output/Output/Shape/Path';
    import { Polygon } from '@output/Output/Shape/Polygon';
    import { Rectangle } from '@output/Output/Shape/Rectangle';
    import type Shape from '@output/Output/Shape/Shape';
    import Evaluate from '@nodes/Evaluate';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { pickReadableName } from '@locale/getConceptName';
    import OutputHandles from '@components/output/OutputHandles.svelte';
    import PathHandles from '@components/output/PathHandles.svelte';
    import moveOutputWithKey from '@components/output/keyboardMove';
    import {
        getAnnouncer,
        getProject,
        getSelectedOutput,
        getStageGrid,
        getStageScene,
    } from '@components/project/Contexts';

    interface Props {
        shape: Shape;
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
        shape,
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

    // Visible if z is ahead of focus and font size is greater than 0. Flat
    // (HUD) output ignores z, so it's always in front.
    let visible = $derived(flat || place.z > focus.z);

    let selectable = $derived(shape.selectable);

    // The localized name of this shape's form kind (Rectangle/Circle/Polygon), used to
    // label the shape and its handles specifically rather than generically as a "phrase".
    let shapeKindName = $derived(
        $locales.getPrimaryPlainText(
            (l) =>
                pickReadableName(
                    shape.form instanceof Rectangle
                        ? l.output.Rectangle.names
                        : shape.form instanceof Circle
                          ? l.output.Circle.names
                          : shape.form instanceof Path
                            ? l.output.Path.names
                            : l.output.Polygon.names,
                ) ?? '',
        ),
    );

    // What paints the form. A form with no interior can't be filled however `filled` is set,
    // and a shape with neither fill nor stroke draws nothing — which is legitimate, since a
    // Shape on a Stage is a physics barrier whether or not it's visible.
    let shapeColor = $derived(
        getColorCSS(shape.getFirstRestPose(), shape.pose, context.adapting),
    );
    let fill = $derived(
        shape.filled && shape.form.isClosed()
            ? (shape.background?.toCSS(context.adapting) ?? shapeColor)
            : 'none',
    );
    // currentColor rather than nothing, so an unfilled shape given no color is still visible.
    // On a filled shape it resolves to the same value the fill used, so it stays invisible there.
    let stroke = $derived(
        shape.stroked
            ? (shape.getDefaultPose()?.color?.toCSS(context.adapting) ??
                  'currentColor')
            : 'none',
    );
    let strokeWidth = $derived(shape.form.getThickness());

    // The outline element, measured to decide how many times the glyphs repeat.
    let outline = $state<SVGPathElement | undefined>(undefined);
    // Keyed by the creator's node id, which is a number — never getHTMLID(), whose name half is
    // creator-supplied text going straight into an href selector.
    let baselineID = $derived(`baseline-${shape.value.creator.id}`);

    /**
     * The glyphs, repeated to fill the outline.
     *
     * The length comes from the rendered path rather than from the form's own arithmetic, so
     * one measurement covers every form; textPath clips whatever runs past the end, so
     * over-estimating is harmless and under-estimating would leave a gap. Capped, because a
     * long path drawn with one narrow glyph would otherwise build an enormous string.
     */
    let run = $state('');
    $effect(() => {
        const glyphs = shape.glyphs;
        // Named so the effect re-runs when the geometry or the type does.
        const d = shape.form.toSVGPath(0, 0);
        const face = context.face;
        const size = context.size;
        if (
            outline === undefined ||
            glyphs === undefined ||
            glyphs.length === 0 ||
            d === ''
        ) {
            run = '';
            return;
        }
        const total = outline.getTotalLength();
        const width = getTextMetrics(
            glyphs,
            `${getSizeCSS(size) ?? '12px'} ${getFaceCSS(face) ?? 'sans-serif'}`,
            context.layout,
        )?.width;
        const times =
            width === undefined || width <= 0
                ? 1
                : Math.ceil(total / width) + 1;
        run = glyphs.repeat(
            Math.max(
                1,
                Math.min(times, Math.floor(MaxGlyphRun / glyphs.length)),
            ),
        );
    });

    // Selected if this shape's value creator is the selected output. Gated on `inspectable`
    // and `editing` (paused) so the highlight only shows in a selectable, stopped view.
    let selected = $derived(
        inspectable &&
            editing &&
            shape.value.creator instanceof Evaluate &&
            $project !== undefined &&
            selection?.includes(shape.value.creator, $project),
    );

    // True only when this is the SOLE selected output (see PhraseView): handles and keyboard focus
    // apply to one output, and rendering handles for every output in a multi-selection makes their
    // shared focus state fight (infinite effect loop).
    let soleSelected = $derived(
        selected === true &&
            $project !== undefined &&
            selection?.getOutput($project).length === 1,
    );

    let width = $derived(shape.form.getWidth() * PX_PER_METER);
    let height = $derived(shape.form.getHeight() * PX_PER_METER);

    // The shape element, bound so handle drags can measure its center.
    let view = $state<HTMLDivElement | undefined>(undefined);

    // The creator Evaluate (narrowed), passed to the shared handles + caret selection.
    let creator = $derived(
        shape.value.creator instanceof Evaluate
            ? shape.value.creator
            : undefined,
    );

    // Focus the shape div when it's the SOLE selection (so keyboard handle navigation works),
    // and only when the stage is what selected it — not the editor's caret or the palette.
    $effect(() => {
        if (soleSelected && selection?.shouldTakeFocus() && view)
            setKeyboardFocus(view, 'Focused on selected shape.');
    });

    // Move the selected shape with the arrow keys (edit-mode-only: moving mutates the
    // program), so it can be repositioned with the keyboard alone — mirroring PhraseView.
    // Alt+arrow is left for the stage's output-to-output focus navigation.
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
            output: shape,
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
            description = shape.getDescription($locales);
        lastFrame = frame;
    });
</script>

{#if visible}
    <!-- Non-selectable shapes are exposed as images, exactly as phrases are: a
         role is required for aria-label/aria-roledescription to be legal ARIA
         on a div, and without one axe rejects the label outright — so the
         description a screen reader is meant to hear was thrown away. -->
    <div
        bind:this={view}
        role={selectable ? 'button' : 'img'}
        aria-disabled={!selectable}
        aria-label={description}
        aria-roledescription={!selectable ? shapeKindName : null}
        aria-pressed={selectable && editing && inspectable ? selected : null}
        class="output shape {shape.form instanceof Rectangle
            ? 'rectangle'
            : shape.form instanceof Circle
              ? 'circle'
              : shape.form instanceof Polygon
                ? 'polygon'
                : ''}"
        class:open={!shape.form.isClosed()}
        class:selected
        tabIndex={interactive && (selectable || editing) ? 0 : null}
        onkeydown={interactive ? handleKeyDown : null}
        data-id={shape.getHTMLID()}
        data-node-id={shape.value.creator.id}
        data-name={shape.getName()}
        data-selectable={selectable}
        style:font-family={getFaceCSS(context.face)}
        style:font-size={getSizeCSS(context.size)}
        style:background={fill === 'none'
            ? null
            : (shape.background?.toCSS(context.adapting) ?? null)}
        style:color={getColorCSS(
            shape.getFirstRestPose(),
            shape.pose,
            context.adapting,
        )}
        style:opacity={getOpacityCSS(shape.getFirstRestPose(), shape.pose)}
        style:width="{width}px"
        style:height="{height}px"
        style:transform={toOutputTransform(
            shape.getFirstRestPose(),
            shape.pose,
            place,
            focus,
            parentAscent,
            {
                width,
                height,
                ascent: height,
                descent: 0,
            },
            undefined,
            flat,
        )}
    >
        <svg
            class="form"
            role="presentation"
            width={shape.form.getWidth() * PX_PER_METER}
            height={shape.form.getHeight() * PX_PER_METER}
            xmlns="http://www.w3.org/2000/svg"
        >
            <!-- One path carries both the fill and the outline, so they can
                 never disagree about where the form is: the border used to be a
                 CSS border on the box around this SVG, which drew a polygon's
                 outline as a rounded rectangle and left a crescent of stage
                 between a circle and its own border. The fill falls back to the
                 shape's own colour before the grey default, because the grey is
                 opaque and painted over a shape given a `color` and no
                 `background`. See `fill` and `stroke` above for how `filled`,
                 `stroked` and an open form decide what is painted. -->
            <path
                bind:this={outline}
                id={baselineID}
                class="border"
                d={shape.form.toSVGPath(0, 0)}
                {fill}
                {stroke}
                stroke-width={strokeWidth === undefined
                    ? null
                    : strokeWidth * PX_PER_METER}
            />
            <!-- Glyphs laid along the form's own outline, which is the path above rather than
                 a copy in <defs>: one geometry, so the words can never disagree with the line
                 they follow, and it works on a circle or a hexagon as readily as on a drawn
                 path. The SVG stays presentational — the glyphs are spoken as part of the
                 shape's own description, so a screen reader hears them once. -->
            {#if run.length > 0}
                <text fill={shapeColor} stroke="none"
                    ><textPath href="#{baselineID}">{run}</textPath></text
                >
            {/if}
        </svg>
        <!-- Handles render after the SVG so the (opaque) form fill doesn't paint over them.
             Editable-only, since dragging them mutates the program. -->
        <!-- A selected path's own points, so a drawn line can be reshaped rather than only
             moved, scaled and rotated as a whole. Rendered beside the rotate/resize handles
             rather than behind a mode of their own: a path's points are what it is. -->
        {#if soleSelected && editable && creator && shape.form instanceof Path}
            <PathHandles {creator} path={shape.form} />
        {/if}
        {#if soleSelected && editable && creator}
            <OutputHandles
                {creator}
                {view}
                selected={soleSelected}
                name={shapeKindName}
                rotation={shape.pose.rotation ?? 0}
                size={1}
            />
        {/if}
    </div>
{/if}

<style>
    .shape {
        position: absolute;
        left: 0;
        top: 0;
        /* This disables translation around the center; we want to translate around the focus.*/
        transform-origin: 0 0;

        /* Outputs are inert by default; only become clickable when editing or
           explicitly selectable, matching PhraseView. */
        pointer-events: none;
    }

    :global(.editing) .shape {
        pointer-events: all;
    }

    .shape[data-selectable='true'] {
        cursor: pointer;
        pointer-events: all;
    }

    /* Let the .shape div own hit-testing; the SVG's visiblePainted default would
       otherwise only register clicks on the painted path, leaving transparent
       interior/corner regions unselectable. */
    .form {
        /* Block, not the SVG default of inline: an inline SVG sits on the text baseline of
           its line box, and a shape's div carries the stage's font size (64px for a 1m
           stage), so the form was painted most of a line below the box that selects it,
           handles it, and hit-tests it. A path made that visible because its box is short
           relative to that line; every shape had it. */
        display: block;
        fill: var(--wordplay-inactive-color);
        stroke-width: calc(2 * var(--wordplay-border-width));
        /* A stroke straddles the path, so half of it falls outside the SVG's
           own box and would be clipped away. */
        overflow: visible;
        pointer-events: none;
    }

    /* A drawn line is drawn with something round, so its ends and its bends are round.
       Only an open form: a rectangle's stroke has corners, and rounding those would change
       every shape that already ships. */
    .shape.open :global(.form) {
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .shape.rectangle {
        border-radius: var(--wordplay-border-radius);
    }

    .shape.circle {
        border-radius: 50%;
    }
</style>
