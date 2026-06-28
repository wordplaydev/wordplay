<script lang="ts">
    import GroupView from '@components/output/GroupView.svelte';
    import getConceptName from '@locale/getConceptName';

    import OutputHandles from '@components/output/OutputHandles.svelte';
    import PhraseView from '@components/output/PhraseView.svelte';
    import ShapeView from '@components/output/ShapeView.svelte';
    import moveOutput from '@components/palette/editOutput';
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { DB, locales } from '@db/Database';
    import Evaluate from '@nodes/Evaluate';
    import type { Form } from '@output/Form';
    import Group from '@output/Group';
    import {
        PX_PER_METER,
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
        sizeToPx,
        toOutputTransform,
    } from '@output/outputToCSS';
    import Phrase from '@output/Phrase';
    import type Place from '@output/Place';
    import type RenderContext from '@output/RenderContext';
    import Shape from '@output/Shape';
    import Stage from '@output/Stage';
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
    let project = getProject();

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

    // Gated on `editable && editing` (paused) so handles/highlight only show when stopped,
    // consistent with PhraseView and ShapeView.
    let selected = $derived(
        editable &&
            editing &&
            group.value.creator instanceof Evaluate &&
            $project !== undefined &&
            selection?.includes(group.value.creator, $project),
    );

    // True only when this is the SOLE selected output (see PhraseView): handles and keyboard focus
    // apply to one output, and rendering handles for every output in a multi-selection makes their
    // shared focus state fight (infinite effect loop).
    let soleSelected = $derived(
        selected === true &&
            $project !== undefined &&
            selection?.getOutput($project).length === 1,
    );

    // The group element, bound so handle drags can measure its center.
    let view = $state<HTMLDivElement | undefined>(undefined);

    // The creator Evaluate (narrowed), passed to the shared handles.
    let creator = $derived(
        group.value.creator instanceof Evaluate
            ? group.value.creator
            : undefined,
    );

    // Focus the group div when it's the SOLE selection (so keyboard handle navigation works). Gated
    // on a single selection so a multi-select (e.g. Cmd/Ctrl+A) doesn't make every selected view race
    // to grab focus.
    $effect(() => {
        if (soleSelected && !root && view)
            setKeyboardFocus(view, 'Focused on selected group.');
    });

    // Move the selected group with the arrow keys (paused-only, since `selected` requires it),
    // so it can be repositioned with the keyboard alone — mirroring PhraseView/ShapeView. The
    // root group (the Stage) is never `selected`, so it won't move. Alt+arrow is left for the
    // stage's output-to-output focus navigation.
    function handleKeyDown(event: KeyboardEvent) {
        if (
            !selected ||
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
        moveOutput(
            DB,
            $project,
            [creator],
            $locales,
            horizontal,
            vertical,
            true,
        );
    }

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
    bind:this={view}
    role={!group.selectable ? null : 'group'}
    aria-label={selected && !root
        ? `${description ?? ''} ${$locales.getPlainText(
              (l) => l.ui.output.selectedSuffix,
          )}`.trim()
        : description}
    aria-roledescription={group instanceof Group
        ? $locales.getPlainText((l) => getConceptName(l, 'group'))
        : $locales.getPlainText((l) => getConceptName(l, 'stage'))}
    aria-hidden={empty ? 'true' : null}
    class="output group {group instanceof Group ? 'Group' : 'Stage'}"
    class:selected={selected && !root}
    class:background={group instanceof Group && group.background !== undefined}
    class:root
    tabIndex={!root && interactive && (group.selectable || editing) ? 0 : null}
    onkeydown={!root && interactive ? handleKeyDown : null}
    data-id={group.getHTMLID()}
    data-node-id={group.value.creator.id}
    data-name={group.getName()}
    data-selectable={group.selectable}
    style:width={sizeToPx(layout.width)}
    style:height={sizeToPx(layout.height)}
    style:font-family={getFaceCSS(localContext.face)}
    style:font-size={getSizeCSS(localContext.size)}
    style:background={group instanceof Group ? group.background?.toCSS() : null}
    style:outline-color={group instanceof Group
        ? group.background?.toCSS()
        : null}
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
                {editable}
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
    <!-- Rotate/resize handles for a selected (non-root) group. -->
    {#if soleSelected && !root && creator}
        <OutputHandles
            {creator}
            {view}
            selected={soleSelected}
            name={$locales.getPlainText((l) => getConceptName(l, 'group'))}
            rotation={group.pose.rotation ?? 0}
            size={group.pose.scale ?? 1}
        />
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

    .group.background {
        outline-style: solid;
        outline-width: calc(var(--wordplay-spacing) / 2);
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

    .group:not(:global(.selected)):focus {
        outline: none;
        background-color: var(--wordplay-focus-color);
    }
</style>
