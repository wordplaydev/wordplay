<svelte:options immutable={true} />

<script lang="ts">
    import { HighlightTypes, type HighlightType } from './util/Highlights';
    import type { Outline } from './util/outline';

    const HIGHLIGHT_PADDING = 20;

    export let outline: Outline;
    export let underline: Outline;
    export let types: HighlightType[];
    export let above: boolean;
    export let ignored: boolean = false;

    $: filteredClasses = types
        .filter((type) => HighlightTypes[type] === above)
        .join(' ');

    // Flip back to unignored after the animation so we can give more feedback.
    $: if (ignored) setTimeout(() => (ignored = false), 250);
</script>

<svg
    class={`highlight outline ${filteredClasses}`}
    class:ignored
    style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${
        outline.minx - HIGHLIGHT_PADDING
    }px; `}
    width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2}
    height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2}
    viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${
        outline.miny - HIGHLIGHT_PADDING
    } ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${
        outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1
    }`}
>
    <path d={outline.path} />
</svg><svg
    class={`highlight underline ${filteredClasses}`}
    class:ignored
    style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${
        outline.minx - HIGHLIGHT_PADDING
    }px; `}
    width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2}
    height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2}
    viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${
        outline.miny - HIGHLIGHT_PADDING
    } ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${
        outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1
    }`}
>
    <path d={underline.path} />
</svg>

<style>
    /* Position selections relative to the node view */
    .highlight {
        position: absolute;
        top: 0;
        left: 0;
        /* Pure visual indicator. No events. Otherwise it interferes with node view events. */
        pointer-events: none;
    }

    .highlight path {
        fill: none;
        stroke-width: var(--wordplay-border-radius);
        stroke-linejoin: round;
    }

    /* Selections do stroke and background of different colors to give the node a sense of shape */
    .hovered:not(.selected).outline path {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
        opacity: 0.2;
    }

    .outline.selected path {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    .outline.dragged path {
        fill: var(--wordplay-highlight);
        stroke: var(--wordplay-highlight);
        opacity: 0.2;
    }

    .outline.dragging path {
        fill: var(--wordplay-highlight);
        stroke: var(--wordplay-highlight);
    }

    .outline.evaluating path {
        fill: var(--wordplay-evaluation-color);
        stroke: var(--wordplay-evaluation-color);
        opacity: 0.7;
    }

    .outline.animating path {
        fill: var(--wordplay-evaluation-color);
        stroke: var(--wordplay-evaluation-color);
        animation: 1s ease-in-out shift infinite;
    }

    :global(
            .node-view.evaluating .token-view,
            .node-view.animating .token-view,
            .node-view.dragging .token-view,
            .node-view.selected .token-view
        ) {
        color: var(--wordplay-background) !important;
    }

    /* Drop targets animate stroke */
    .outline.target path {
        stroke: var(--wordplay-highlight);
        animation: pulse 1s infinite;
        opacity: 1;
    }

    .outline.match path {
        stroke: var(--wordplay-highlight);
        animation: pulse 0.2s infinite;
    }

    /* Conflicts layer on top of everything else */
    .underline.primary path {
        stroke: var(--wordplay-error);
    }

    .underline.secondary path,
    .underline.minor path {
        stroke: var(--wordplay-warning);
    }

    .underline.exception path {
        stroke: var(--wordplay-error);
        fill: var(--wordplay-error);
        stroke-width: calc(2 * var(--wordplay-border-width));
        stroke-dasharray: calc(2 * var(--wordplay-border-width));
        animation: exception 0.5s linear infinite;
    }

    @keyframes exception {
        0% {
            stroke-dashoffset: 0;
        }
        100% {
            stroke-dashoffset: calc(4 * var(--wordplay-border-width));
        }
    }

    .ignored {
        animation: shake 0.25s 1;
    }

    .outline.output path {
        stroke: var(--wordplay-highlight);
        stroke-dasharray: 4px;
        stroke-width: var(--wordplay-focus-width);
    }
</style>
