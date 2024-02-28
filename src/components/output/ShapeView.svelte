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
    import { Rectangle, Line } from '../../output/Form';

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
    // $: lineWidth = 10 - 

    let top = shape.form.getTop() * PX_PER_METER
    let left = shape.form.getLeft() * PX_PER_METER  
    let color = shape.getBackground()?.toCSS()

    let shapeClass = '';
    if(shape.form instanceof Rectangle) {
        shapeClass = 'rectangle'
    } else if(shape.form instanceof Line) {
        shapeClass = 'line'
    }

    const lineWidth = 10;
    $: lineLength = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    $: angle = calcAngle(shape.form.getLeft(), shape.form.getTop(), shape.form.getLeft() + shape.form.getWidth(), shape.form.getTop() + shape.form.getHeight());

    // Function to calculate angle
    function calcAngle(x1: number, y1: number, x2: number, y2: number) {
        const angleRadians = Math.atan2(y2 - y1, x2 - x1);
        const angleDegrees = (angleRadians * 180) / Math.PI;
        const positiveAngle = angleDegrees >= 0 ? angleDegrees : 360 + angleDegrees;
        return positiveAngle;
    }
</script>

{#if visible}
    {#if shapeClass == 'rectangle'}
        <div
            role={selectable ? 'button' : 'presentation'}
            aria-disabled={!selectable}
            aria-label={still ? shape.getDescription($locales) : null}
            aria-roledescription={!selectable
                ? $locales.get((l) => l.term.phrase)
                : null}
            class="output shape {shapeClass}"
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
                    descent: 0
                }
            )}
        />
    {/if}
    <!-- style:background-color="{color?.toCSS()}" add this if implementing color-->
    {#if shapeClass == 'line'}
        <div
            role={selectable ? 'button' : 'presentation'}
            aria-disabled={!selectable}
            aria-label={still ? shape.getDescription($locales) : null}
            aria-roledescription={!selectable
                ? $locales.get((l) => l.term.phrase)
                : null}
            class="output shape {shapeClass}"
            tabIndex={interactive && (selectable || editing) ? 0 : null}
            data-id={shape.getHTMLID()}
            data-node-id={shape.value.creator.id}
            data-name={shape.getName()}
            data-selectable={selectable}
            style:font-family={getFaceCSS(context.face)}
            style:font-size={getSizeCSS(context.size)}
            style:border-color="rgb(255,0,0)"
            style:background={shape.background?.toCSS() ?? null}
            style:color={getColorCSS(shape.getFirstRestPose(), shape.pose)}
            style:opacity={getOpacityCSS(shape.getFirstRestPose(), shape.pose)}
            style:width="{lineWidth}px"
            style:height="{lineLength}px"
            style:transform={`translate(${left}px, ${top}px) rotate(${angle}deg)`}
        />
    {/if}
{/if}

<style>
    .shape {
        position: absolute;
        left: 0;
        top: 0;
        /* This disables translation around the center; we want to translate around the focus.*/
        transform-origin: 0 0;
    }

    .shape.rectangle {
        background: var(--wordplay-inactive-color);
        border-radius: calc(2 * var(--wordplay-border-radius));
        border-width: calc(2 * var(--wordplay-border-width));
        border-style: solid;
        border-color: transparent;
    }

    .shape.line {
        background: var(--wordplay-inactive-color);
        position: absolute;
    }
</style>
