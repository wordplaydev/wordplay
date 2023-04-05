<svelte:options immutable={true} />

<script lang="ts">
    import type Place from '@output/Place';
    import outputToCSS, { PX_PER_METER } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Pose from '@output/Pose';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import Group from '@output/Group';
    import type Verse from '@output/Verse';
    import Evaluate from '@nodes/Evaluate';
    import { getSelectedOutput } from '../project/Contexts';
    import { preferredTranslations } from '@translation/translations';

    export let group: Group | Verse;
    export let place: Place;
    export let focus: Place;
    export let root: boolean = false;
    export let interactive: boolean;
    export let parentAscent: number;
    export let context: RenderContext;
    export let editing: boolean;

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
    aria-label={group.getDescription(
        $preferredTranslations.map((t) => t.language)
    )}
    aria-roledescription={group instanceof Group
        ? $preferredTranslations[0].terminology.group
        : $preferredTranslations[0].terminology.verse}
    aria-hidden={empty ? 'true' : null}
    class="output group {group.constructor.name}"
    class:selected={selected && !root}
    class:root
    tabIndex={!root && interactive && (group.selectable || editing) ? 0 : null}
    data-id={group.getHTMLID()}
    data-node-id={group.value.creator.id}
    data-name={group.getName()}
    data-selectable={group.selectable}
    style={outputToCSS(
        context.font,
        context.size,
        group.rotation,
        // No first pose because of an empty sequence? Give a default.
        group.rest instanceof Pose
            ? group.rest
            : group.rest.getFirstPose() ?? new Pose(group.value),
        place,
        layout.width,
        layout.height,
        focus,
        root,
        parentAscent,
        {
            width: layout.width * PX_PER_METER,
            ascent: layout.height * PX_PER_METER,
        }
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
            />
        {/if}
    {/each}
</div>

<style>
    .group {
        position: absolute;
        left: 0;
        top: 0;
    }

    .group[data-selectable='true'] {
        cursor: pointer;
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
