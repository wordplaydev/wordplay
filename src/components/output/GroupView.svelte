<script lang="ts">
    import GroupView from './GroupView.svelte';

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
    import Stage from '../../output/Stage';
    import { locales } from '../../db/Database';
    import type { Form } from '../../output/Form';
    import Shape from '../../output/Shape';
    import ShapeView from './ShapeView.svelte';
    import { untrack } from 'svelte';

    interface Props {
        group: Group | Stage;
        place: Place;
        focus: Place;
        viewport?: { width: number; height: number } | undefined;
        clip?: Form | undefined;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        editing: boolean;
        // A frame counter, used to update aria-labels at a slower rate then visual updates.
        frame: number;
        children?: import('svelte').Snippet;
    }

    let {
        group,
        place,
        focus,
        viewport = undefined,
        clip = undefined,
        interactive,
        parentAscent,
        context,
        editable,
        editing,
        frame,
        children,
    }: Props = $props();

    let root = $derived(viewport !== undefined);

    let selection = getSelectedOutput();

    // Compute a local context based on size and font.
    let localContext = $derived(group.getRenderContext(context));

    let empty = $derived(group.isEmpty());

    let layout = $derived(group.getLayout(localContext));

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    let ordered = $derived(layout.places.sort(([, a], [, b]) => b.z - a.z));

    // When rendering the children, we need to convert the focus coordinate we were given
    // into this view's coordinate system so that the perspective rendering is in the right coordinates.
    let offsetFocus = $derived(focus.offset(place));

    let selected = $derived(
        group.value.creator instanceof Evaluate &&
            selection?.selectedOutput.includes(group.value.creator),
    );

    let description: string | null = $state(null);
    let lastFrame = $state(0);
    $effect(() => {
        if (group.description) description = group.description.text;
        else if (frame > untrack(() => lastFrame))
            description = group.getDescription($locales);
        lastFrame = frame;
    });
</script>

<div
    role={!group.selectable ? null : 'group'}
    aria-label={description}
    aria-roledescription={group instanceof Group
        ? $locales.get((l) => l.term.group)
        : $locales.get((l) => l.term.stage)}
    aria-hidden={empty ? 'true' : null}
    class="output group {group instanceof Group ? 'Group' : 'Stage'}"
    class:selected={selected && !root}
    class:root
    tabIndex={!root && interactive && (group.selectable || editing) ? 0 : null}
    data-id={group.getHTMLID()}
    data-node-id={group.value.creator.id}
    data-name={group.getName()}
    data-selectable={group.selectable}
    style:width={sizeToPx(layout.width)}
    style:height={sizeToPx(layout.height)}
    style:font-family={getFaceCSS(localContext.face)}
    style:font-size={getSizeCSS(localContext.size)}
    style:background={(group instanceof Group
        ? group.background?.toCSS()
        : null) ?? null}
    style:color={getColorCSS(group.getFirstRestPose(), group.pose)}
    style:opacity={getOpacityCSS(group.getFirstRestPose(), group.pose)}
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
            descent: 0,
        },
        viewport,
    )}
    style:clip-path={clip ? clip.toCSSClip() : null}
>
    {@render children?.()}
    {#each ordered as [child, childPlace] (child.getName())}
        {#if child instanceof Phrase}
            <PhraseView
                phrase={child}
                place={childPlace}
                focus={offsetFocus}
                {interactive}
                parentAscent={root ? 0 : layout.height}
                context={localContext}
                {editable}
                {editing}
                {frame}
            />
        {:else if child instanceof Shape}
            <ShapeView
                shape={child}
                place={childPlace}
                focus={offsetFocus}
                {interactive}
                parentAscent={root ? 0 : layout.height}
                context={localContext}
                {editing}
                {frame}
            />
        {:else if child instanceof Group || child instanceof Stage}
            <GroupView
                group={child}
                place={childPlace}
                focus={offsetFocus}
                parentAscent={root ? 0 : layout.height}
                {interactive}
                context={localContext}
                {editable}
                {editing}
                {frame}
            />
        {/if}
    {/each}
    {#if clip}
        <svg
            class="frame"
            role="presentation"
            width={clip.getWidth() * PX_PER_METER}
            height={clip.getHeight() * PX_PER_METER}
            xmlns="http://www.w3.org/2000/svg"
            style="transform: translate({clip.getLeft() *
                PX_PER_METER}px, {-clip.getTop() * PX_PER_METER}px)"
        >
            <path class="border" d={clip.toSVGPath(0, 0)} />
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

    :global(.stage.editing.interactive)
        .group:not(:global(.selected)):not(:global(.root)) {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-inactive-color);
    }

    :global(.stage.editing.interactive) .group.selected {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-highlight-color);
    }

    .group:not(:global(.selected)):focus {
        outline: none;
        background-color: var(--wordplay-focus-color);
    }
</style>
