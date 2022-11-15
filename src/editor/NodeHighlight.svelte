<script lang="ts">
    import type { Outline } from "./outline";

    const HIGHLIGHT_PADDING = 20;

    export let outline: Outline;
    export let underline: Outline;

</script>

<svg class={`highlight outline`} 
     style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${outline.minx - HIGHLIGHT_PADDING}px; `} 
     width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} 
     height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2} 
     viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${outline.miny - HIGHLIGHT_PADDING} ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1}`}>
     <path d={outline.path}/>
</svg><svg class={`highlight underline`} 
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
        z-index: 0;
    }

    .underline {
        z-index: 2;
    }
    
    .highlight path {
        fill: none;
        stroke-width: var(--wordplay-border-width);
        stroke-linejoin: round;
    }

    /* Selections do stroke and background of different colors to give the node a sense of shape */
    :global(.hovered) > .outline path {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
        opacity: 0.2;
    }

    :global(.selected) > .outline path {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    :global(.dragged) > .outline path {
        fill: var(--wordplay-highlight);
        stroke: var(--wordplay-highlight);
    }
 
    :global(.executing) > .outline path {
        fill: var(--wordplay-warning);
        stroke: var(--wordplay-warning);
    }

    :global(
        .executing .token-view,
        .dragged .token-view,
        .selected .token-view
    ) { 
        color: var(--color-white) !important; 
    }

    /* Drop targets animate stroke */
    :global(.target) > .outline path {
        stroke: var(--wordplay-highlight);
        animation: pulse 1s infinite;
        opacity: 1.0;
    }

    :global(.match) > .outline path{
        stroke: var(--wordplay-highlight);
        animation: pulse .2s infinite;
    }

    /* Conflicts layer on top of everything else */
    :global(.primary) > .underline path {
        stroke: var(--wordplay-error);
    }

    :global(.secondary) > .underline path {
        stroke: var(--wordplay-warning);
    }

</style>