<script lang="ts">
    import type Place from '@output/Place';
    import {
        PX_PER_METER,
        getColorCSS,
        getFaceCSS,
        getSizeCSS,
        getOpacityCSS,
        sizeToPx,
        toOutputTransform,
    } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import Group from '@output/Group';
    import Evaluate from '@nodes/Evaluate';
    import { getSelectedOutput } from '../project/Contexts';
    import type { Shape } from '../../output/Shapes';
    import type Stage from '../../output/Stage';
    import { locale, locales } from '../../db/Database';

    export let group: Group | Stage;
    export let place: Place;
    export let focus: Place;
    export let viewport: { width: number; height: number } | undefined =
        undefined;
    export let clip: Shape | undefined = undefined;
    export let interactive: boolean;
    export let parentAscent: number;
    export let context: RenderContext;
    export let editing: boolean;
    export let still: boolean;

    $: root = viewport !== undefined;

    let selectedOutput = getSelectedOutput();

    // Compute a local context based on size and font.
    $: context = group.getRenderContext(context);

    $: empty = group.isEmpty();

    $: layout = group.getLayout(context);

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    $: ordered = layout.places.sort(([, a], [, b]) => b.z - a.z);

    // When rendering the children, we need to convert the focus coordinate we were given
    // into this view's coordinate system so that the perspective rendering is in the right coordinates.
    $: offsetFocus = focus.offset(place);

    $: selected =
        group.value.creator instanceof Evaluate &&
        $selectedOutput?.includes(group.value.creator);
</script>

<div
    role={!group.selectable ? 'presentation' : 'group'}
    aria-label={still ? group.getDescription($locales) : null}
    aria-roledescription={group instanceof Group
        ? $locale.term.group
        : $locale.term.stage}
    aria-hidden={empty ? 'true' : null}
    class="output group {group.constructor.name}"
    class:selected={selected && !root}
    class:root
    tabIndex={!root && interactive && (group.selectable || editing) ? 0 : null}
    data-id={group.getHTMLID()}
    data-node-id={group.value.creator.id}
    data-name={group.getName()}
    data-selectable={group.selectable}
    style:width={sizeToPx(layout.width)}
    style:height={sizeToPx(layout.height)}
    style:font-family={getFaceCSS(context.face)}
    style:font-size={getSizeCSS(context.size)}
    style:background={group.background?.toCSS() ?? null}
    style:color={getColorCSS(group.getFirstRestPose(), group.pose)}
    style:opacity={getOpacityCSS(group.getFirstRestPose(), group.pose)}
    style:clip-path={clip ? clip.toCSSClip() : null}
    style:transform={toOutputTransform(
        group.getFirstRestPose(),
        group.pose,
        place,
        focus,
        parentAscent,
        {
            width: layout.width * PX_PER_METER,
            height: layout.height * PX_PER_METER,
            ascent: layout.height * PX_PER_METER,
        },
        viewport
    )}
>
    <slot />
    {#each ordered as [child, childPlace] (child.getName())}
        {#if child instanceof Phrase}
            <PhraseView
                phrase={child}
                place={childPlace}
                focus={offsetFocus}
                {interactive}
                parentAscent={root ? 0 : layout.height}
                {context}
                {editing}
                {still}
            />
        {:else}
            <svelte:self
                group={child}
                place={childPlace}
                focus={offsetFocus}
                parentAscent={root ? 0 : layout.height}
                {interactive}
                {context}
                {editing}
                {still}
            />
        {/if}
    {/each}
    {#if clip}
        <svg
            class="frame"
            role="presentation"
            width={clip.getWidth()}
            height={clip.getHeight()}
            xmlns="http://www.w3.org/2000/svg"
            style="transform: translate({clip.getLeft()}px, {clip.getTop()}px)"
        >
            <path class="border" d={clip.toSVGPath()} />
        </svg>
    {/if}
</div>

<style>
    .group {
        position: absolute;
        left: 0;
        top: 0;

        /* This disables translation around the center; we want to translate around the focus.*/
        transform-origin: 0 0;
    }

    .frame {
        pointer-events: none;
        touch-action: none;
    }

    path.border {
        fill: none;
        stroke: var(--wordplay-border-color);
        stroke-width: calc(2 * var(--wordplay-border-width));
    }

    .group[data-selectable='true'] {
        cursor: pointer;
    }

    .content {
        position: relative;
        width: 100%;
        height: 100%;
    }

    :global(.stage.editing.interactive) .group:not(.selected):not(.root) {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-inactive-color);
    }

    :global(.stage.editing.interactive) .group.selected {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-highlight-color);
    }

    .group:not(.selected):focus {
        outline: none;
        background-color: var(--wordplay-focus-color);
    }
</style>
