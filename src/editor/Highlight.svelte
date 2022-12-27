<svelte:options immutable={true}/>
<script lang="ts">
    import type { HighlightType } from "./util/Highlights";
    import type { Outline } from "./util/outline";

    const HIGHLIGHT_PADDING = 20;

    export let outline: Outline;
    export let underline: Outline;
    export let types: HighlightType[];

</script>

<svg class={`highlight outline ${types.join(" ")}`} 
     style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${outline.minx - HIGHLIGHT_PADDING}px; `} 
     width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} 
     height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2} 
     viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${outline.miny - HIGHLIGHT_PADDING} ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1}`}>
     <path d={outline.path}/>
</svg><svg class={`highlight underline ${types.join(" ")}`} 
     style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${outline.minx - HIGHLIGHT_PADDING}px; `} 
     width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} 
     height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2} 
     viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${outline.miny - HIGHLIGHT_PADDING} ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1}`}>
     <path d={underline.path}/>
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

    .outline {
        z-index: var(--wordplay-layer-highlight);
    }

    .underline {
        z-index: var(--wordplay-layer-annotation);
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
    }
 
    .outline.evaluating path {
        fill: var(--wordplay-evaluation-color);
        stroke: var(--wordplay-evaluation-color);
        opacity: 0.70;
    }

    .outline.exception path {
        fill: var(--wordplay-error);
        stroke: var(--wordplay-error);
        opacity: 0.70;
        transform: rotate(1deg);
        transform-box: fill-box;
    }

    :global(
        .exception .token-view,
        .evaluating .token-view,
        .dragged .token-view,
        .selected .token-view
    ) {
        color: var(--color-white) !important; 
    }

    /* Drop targets animate stroke */
    .outline.target path {
        stroke: var(--wordplay-highlight);
        animation: pulse 1s infinite;
        opacity: 1.0;
    }

    .outline.match path{
        stroke: var(--wordplay-highlight);
        animation: pulse .2s infinite;
    }

    /* Conflicts layer on top of everything else */
    .underline.primary path {
        stroke: var(--wordplay-error);
    }

    .underline.secondary path, .underline.minor path {
        stroke: var(--wordplay-warning);
    }

</style>