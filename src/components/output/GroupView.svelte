<svelte:options immutable={true} />

<script lang="ts">
    import type Place from '@output/Place';
    import outputToCSS, { PX_PER_METER } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Pose from '@output/Pose';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import type Group from '@output/Group';
    import type Verse from '../../output/Verse';

    export let group: Group | Verse;
    export let place: Place;
    export let focus: Place;
    export let context: RenderContext;

    // Compute a local context based on size and font.
    $: context = group.getRenderContext(context);

    $: width = group.getWidth(context).times(PX_PER_METER).toNumber();
    $: height = group.getHeight(context).times(PX_PER_METER).toNumber();
    $: places = group.getPlaces(context);

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    $: visible = places
        .filter(([, place]) => place.z.sub(focus.z).greaterThan(0))
        .sort(([, a], [, b]) => b.z.sub(a.z).toNumber());

    // When rendering the children, we need to convert the focus coordinate we were given
    // into this view's coordinate system so that the perspective rendering is in the right coordinates.
    $: offsetFocus = focus.offset(place);
</script>

<div
    class="group {group.constructor.name}"
    data-id={group.getHTMLID()}
    style={outputToCSS(
        context.font,
        context.size,
        // No first pose because of an empty sequence? Give a default.
        group.rest instanceof Pose
            ? group.rest
            : group.rest.getFirstPose() ?? new Pose(group.value),
        place,
        width,
        height,
        focus,
        { width, ascent: height },
        false
    )}
>
    <div class="children">
        {#each visible as [child, childPlace] (child.getName())}
            {#if child instanceof Phrase}
                <PhraseView
                    phrase={child}
                    place={childPlace}
                    focus={offsetFocus}
                    {context}
                />
            {:else}
                <svelte:self
                    group={child}
                    place={childPlace}
                    focus={offsetFocus}
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

    .children {
        position: relative;
        width: 100%;
        height: 100%;
    }
</style>
