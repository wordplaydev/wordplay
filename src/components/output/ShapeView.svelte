<script lang="ts">
    import type Place from '@output/Place';
    import {
        getColorCSS,
        getFaceCSS as getFaceCSS,
        getSizeCSS as getSizeCSS,
        getOpacityCSS,
        toOutputTransform,
        PX_PER_METER,
    } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import { locales } from '../../db/Database';
    import type Shape from '../../output/Shape';
    import { Circle, Polygon, Rectangle } from '../../output/Form';

    export let shape: Shape;
    export let place: Place;
    export let focus: Place;
    export let interactive: boolean;
    export let parentAscent: number;
    export let context: RenderContext;
    export let editing: boolean;
    export let still: boolean;

    // Visible if z is ahead of focus and font size is greater than 0.
    $: visible = place.z > focus.z;

    $: selectable = shape.selectable;

    $: width = shape.form.getWidth() * PX_PER_METER;
    $: height = shape.form.getHeight() * PX_PER_METER;
</script>

{#if visible}
    <div
        role={selectable ? 'button' : null}
        aria-disabled={!selectable}
        aria-label={still ? shape.getDescription($locales) : null}
        aria-roledescription={!selectable
            ? $locales.get((l) => l.term.phrase)
            : null}
        class="output shape {shape.form instanceof Rectangle
            ? 'rectangle'
            : shape.form instanceof Circle
              ? 'circle'
              : shape.form instanceof Polygon
                ? 'polygon'
                : ''}"
        tabIndex={interactive && (selectable || editing) ? 0 : null}
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
    }

    .form {
        fill: var(--wordplay-inactive-color);
    }

    .shape.rectangle {
        border-radius: calc(2 * var(--wordplay-border-radius));
    }

    .shape.circle {
        border-radius: 50%;
    }
</style>
