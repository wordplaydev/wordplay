<svelte:options immutable={true} />

<script lang="ts">
    import type Place from '@output/Place';
    import outputToCSS from '@output/outputToCSS';
    import type { RenderContext } from '@output/RenderContext';
    import Pose from '@output/Pose';
    import type TypographicOutput from '@output/TypeOutput';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import type { OutputName } from '@output/Stage';

    export let group: TypographicOutput;
    export let place: Place;
    export let focus: Place;
    export let context: RenderContext;

    $: width = group.getWidth(context);
    $: height = group.getHeight(context);
    $: places = group.getPlaces(context);

    // Filter out groups that are behind the focus
    // Sort by z to preserve rendering order
    $: visible = places
        .filter(([, place]) => place.z.sub(focus.z).greaterThan(0))
        .sort(([, a], [, b]) => b.z.sub(a.z).toNumber());

    /** Number visible phrases, giving them unique IDs to key off of. */
    let keys: Map<TypographicOutput, OutputName>;
    $: {
        keys = new Map();
        const phraseCounts = new Map<OutputName, number>();
        for (const [group] of visible) {
            const name = group.getName();
            const count = (phraseCounts.get(name) ?? 0) + 1;
            keys.set(group, `${name}-${count}`);
            phraseCounts.set(name, count + 1);
        }
    }

    // When rendering the children, we need to convert the focus coordinate we were given
    // into this view's coordinate system so that the perspective rendering is in the right coordinates.
    $: offsetFocus = focus.offset(place);
</script>

<div
    class="group {group.constructor.name}"
    style={outputToCSS(
        undefined, //group.font,
        undefined, //group.size,
        // No first pose because of an empty sequence? Give a default.
        new Pose(group.value) /*group.rest instanceof Pose
            ? group.rest
            : group.rest.getFirstPose() ?? new Pose(group.value),*/,
        place,
        width.toNumber(),
        height.toNumber(),
        focus,
        { width: width.toNumber(), ascent: height.toNumber() },
        false
    )}
>
    <div class="children">
        {#each visible as [child, childPlace] (keys.get(child) ?? child.getName())}
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
