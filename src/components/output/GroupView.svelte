<svelte:options immutable={true} />

<script lang="ts">
    import type Place from '@output/Place';
    import outputToCSS from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Pose from '@output/Pose';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import type Group from '@output/Group';
    import type Verse from '@output/Verse';

    export let group: Group | Verse;
    export let place: Place;
    export let focus: Place;
    export let root: boolean = false;
    export let context: RenderContext;

    // Compute a local context based on size and font.
    $: context = group.getRenderContext(context);

    $: width = group.getWidth(context).toNumber();
    $: height = group.getHeight(context).toNumber();
    $: places = group.getPlaces(context);

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    $: visible = places.sort(([, a], [, b]) => b.z.sub(a.z).toNumber());

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
        root,
        { width, ascent: height }
    )}
>
    <div class="content">
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
                    parent={place}
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

    .content {
        position: relative;
        width: 100%;
        height: 100%;
    }
</style>
