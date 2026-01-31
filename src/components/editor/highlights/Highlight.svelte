<script lang="ts">
    import { HighlightTypes, type HighlightType } from './Highlights';
    import type { Outline } from './outline';

    const HIGHLIGHT_PADDING = 20;

    interface Props {
        outline: Outline;
        underline: Outline;
        types: HighlightType[];
        above: boolean;
        ignored?: boolean;
    }

    let { outline, underline, types, above, ignored = false }: Props = $props();

    let filteredClasses = $derived(
        types.filter((type) => HighlightTypes[type] === above).join(' '),
    );
</script>

<svg
    class={`highlight outline ${filteredClasses}`}
    class:ignored
    aria-hidden="true"
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
    aria-hidden="true"
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
    @keyframes wave {
        0% {
            transform: translateY(-2px);
        }
        50% {
            transform: translateY(2px);
        }
        100% {
            transform: translateY(-2px);
        }
    }

    @keyframes exception {
        0% {
            stroke-dashoffset: 0;
        }
        100% {
            stroke-dashoffset: calc(4 * var(--wordplay-border-width));
        }
    }

    /* Position selections relative to the node view */
    .highlight {
        position: absolute;
        top: 0;
        left: 0;
        /* Pure visual indicator. No events. Otherwise it interferes with node view events. */
        pointer-events: none;
        touch-action: none;
    }

    .highlight path {
        fill: none;
        stroke-width: var(--wordplay-focus-width);
        stroke-linejoin: round;
    }

    /* Selections do stroke and background of different colors to give the node a sense of shape */
    .hovered:not(:global(.selected)).outline path {
        stroke: var(--wordplay-hover);
        fill: none;
    }

    /* Definitions and uses get hover feedback without border */
    .related:not(:global(.selected)).outline path {
        stroke: none;
        fill: var(--wordplay-hover);
    }

    .outline.selected path {
        stroke: var(--wordplay-highlight-color);
        stroke-width: var(--wordplay-focus-width);
        fill: var(--wordplay-hover);
    }

    .delimiter.outline path {
        stroke: var(--wordplay-highlight-color);
        stroke-width: var(--wordplay-border-width);
        animation: calc(250ms * var(--animation-factor)) linear wave infinite;
        fill: var(--wordplay-hover);
        transform-origin: center;
    }
    .outline.dragged path {
        fill: var(--wordplay-hover);
        stroke: var(--wordplay-hover);
        opacity: 0.2;
    }

    .outline.dragging path {
        stroke: var(--wordplay-border-color);
        stroke-width: var(--wordplay-border-width);
        fill: var(--wordplay-background);
    }

    .outline.evaluating path {
        fill: var(--wordplay-evaluation-color);
        stroke: var(--wordplay-evaluation-color);
        opacity: 0.7;
    }

    .outline.animating path {
        fill: var(--wordplay-evaluation-color);
        stroke: var(--wordplay-evaluation-color);
    }

    .outline.animating path {
        animation: shift ease-in-out infinite;
        animation-duration: calc(var(--animation-factor) * 1s);
    }

    /* Make the text legible inside animating nodes */
    :global(
        .node-view.evaluating .token-view,
        .node-view.animating .token-view,
        .node-view.dragging .token-view
    ) {
        color: var(--wordplay-background) !important;
    }

    /* Drop targets animate stroke */
    .outline.target path,
    .outline.empty path {
        stroke: var(--wordplay-highlight-color);
        animation: pulse infinite;
        animation-duration: calc(var(--animation-factor) * 1s);
    }

    .outline.match path {
        stroke: var(--wordplay-highlight-color);
    }

    /* Conflicts layer on top of everything else */
    .underline.primaryMajor path,
    .underline.secondaryMajor {
        stroke: var(--wordplay-error);
    }

    .underline.primaryMinor path,
    .underline.secondaryMinor path {
        stroke: var(--wordplay-warning);
    }

    .underline.exception path {
        stroke: var(--wordplay-error);
        fill: var(--wordplay-error);
        stroke-width: calc(2 * var(--wordplay-border-width));
        stroke-dasharray: calc(2 * var(--wordplay-border-width));
    }

    .underline.exception path {
        animation: exception linear infinite;
        animation-duration: calc(var(--animation-factor) * 0.5s);
    }

    .ignored {
        transform-origin: 50% 50%;
        transform-box: fill-box;
        animation: shake calc(var(--animation-factor) * 250ms) linear;
    }

    .underline.output path {
        stroke: var(--wordplay-evaluation-color);
        stroke-width: var(--wordplay-focus-width);
    }
</style>
