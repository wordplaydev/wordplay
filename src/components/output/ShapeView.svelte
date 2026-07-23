<script lang="ts">
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
    import { Polygon } from '@output/Output/Shape/Polygon';
    import { Rectangle } from '@output/Output/Shape/Rectangle';
    import type Shape from '@output/Output/Shape/Shape';
    import Evaluate from '@nodes/Evaluate';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import OutputHandles from '@components/output/OutputHandles.svelte';
    import moveOutput from '@components/palette/editOutput';
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';

    interface Props {
        shape: Shape;
        place: Place;
        focus: Place;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        /** Whether the creator can select this output for inspection (edit or step mode). */
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

    // Visible if z is ahead of focus and font size is greater than 0. Flat
    // (HUD) output ignores z, so it's always in front.
    let visible = $derived(flat || place.z > focus.z);

    let selectable = $derived(shape.selectable);

    // The localized name of this shape's form kind (Rectangle/Circle/Polygon), used to
    // label the shape and its handles specifically rather than generically as a "phrase".
    let shapeKindName = $derived(
        $locales.getUnannotatedTexts(
            shape.form instanceof Rectangle
                ? (l) => l.output.Rectangle.names
                : shape.form instanceof Circle
                  ? (l) => l.output.Circle.names
                  : (l) => l.output.Polygon.names,
        )[0] ?? '',
    );

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

    // Focus the shape div when it's the SOLE selection (so keyboard handle navigation works).
    $effect(() => {
        if (soleSelected && view)
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
            creator === undefined ||
            !event.key.startsWith('Arrow')
        )
            return;
        const increment = 0.5;
        const horizontal =
            event.key === 'ArrowLeft'
                ? -increment
                : event.key === 'ArrowRight'
                  ? increment
                  : 0;
        const vertical =
            event.key === 'ArrowUp'
                ? increment
                : event.key === 'ArrowDown'
                  ? -increment
                  : 0;
        event.stopPropagation();
        moveOutput(DB, $project, [creator], $locales, horizontal, vertical, true);
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
    <div
        bind:this={view}
        role={selectable ? 'button' : null}
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
        class:selected
        tabIndex={interactive && (selectable || editing) ? 0 : null}
        onkeydown={interactive ? handleKeyDown : null}
        data-id={shape.getHTMLID()}
        data-node-id={shape.value.creator.id}
        data-name={shape.getName()}
        data-selectable={selectable}
        style:font-family={getFaceCSS(context.face)}
        style:font-size={getSizeCSS(context.size)}
        style:border-color={shape.getDefaultPose()?.color?.toCSS()}
        style:background={shape.background?.toCSS() ?? null}
        style:color={getColorCSS(shape.getFirstRestPose(), shape.pose)}
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
            <path
                class="border"
                d={shape.form.toSVGPath(0, 0)}
                fill={shape.background?.toCSS() ?? null}
            />
        </svg>
        <!-- Handles render after the SVG so the (opaque) form fill doesn't paint over them.
             Editable-only, since dragging them mutates the program. -->
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

        border-width: calc(2 * var(--wordplay-border-width));
        border-style: solid;
        border-color: transparent;

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
        fill: var(--wordplay-inactive-color);
        pointer-events: none;
    }

    .shape.rectangle {
        border-radius: var(--wordplay-border-radius);
    }

    .shape.circle {
        border-radius: 50%;
    }
</style>
