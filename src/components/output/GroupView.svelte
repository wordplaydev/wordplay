<svelte:options immutable={true} />

<script lang="ts">
    import type Place from '@output/Place';
    import outputToCSS, { PX_PER_METER } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Pose from '@output/Pose';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import type Group from '@output/Group';
    import type Verse from '@output/Verse';
    import Evaluate from '@nodes/Evaluate';
    import { getSelectedOutput } from '../project/Contexts';

    export let group: Group | Verse;
    export let place: Place;
    export let focus: Place;
    export let root: boolean = false;
    export let interactive: boolean;
    export let parentAscent: number;
    export let context: RenderContext;

    let selectedOutput = getSelectedOutput();

    // Compute a local context based on size and font.
    $: context = group.getRenderContext(context);

    $: width = group.getWidth(context);
    $: height = group.getHeight(context);
    $: places = group.getPlaces(context);

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    $: ordered = places.sort(([, a], [, b]) => b.z - a.z);

    // When rendering the children, we need to convert the focus coordinate we were given
    // into this view's coordinate system so that the perspective rendering is in the right coordinates.
    $: offsetFocus = focus.offset(place);

    $: selected =
        group.value.creator instanceof Evaluate &&
        $selectedOutput?.includes(group.value.creator);
</script>

<div
    class="output group {group.constructor.name}"
    class:selected={selected && !root}
    class:root
    tabIndex={!root && interactive ? 0 : null}
    data-id={group.getHTMLID()}
    data-node-id={group.value.creator.id}
    style={outputToCSS(
        context.font,
        context.size,
        group.rotation,
        // No first pose because of an empty sequence? Give a default.
        group.rest instanceof Pose
            ? group.rest
            : group.rest.getFirstPose() ?? new Pose(group.value),
        place,
        width,
        height,
        focus,
        root,
        parentAscent,
        { width: width * PX_PER_METER, ascent: height * PX_PER_METER }
    )}
>
    <div class="content">
        <slot />
        {#each ordered as [child, childPlace] (child.getName())}
            {#if child instanceof Phrase}
                <PhraseView
                    phrase={child}
                    place={childPlace}
                    focus={offsetFocus}
                    {interactive}
                    parentAscent={root ? 0 : height}
                    {context}
                />
            {:else}
                <svelte:self
                    group={child}
                    place={childPlace}
                    focus={offsetFocus}
                    parentAscent={root ? 0 : height}
                    {interactive}
                    {context}
                />
            {/if}
        {/each}
    </div>
</div>

<style>
    .group {
        position: absolute;
        left: 0;
        top: 0;
    }

    .content {
        position: relative;
        width: 100%;
        height: 100%;
    }

    :global(.verse.editing.interactive) .group:not(.selected):not(.root) {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-disabled-color);
    }

    :global(.verse.editing.interactive) .group.selected {
        outline: var(--wordplay-border-width) dotted var(--wordplay-highlight);
    }

    .group:not(.selected):focus {
        outline: none;
        background-color: var(--wordplay-highlight);
    }
</style>
