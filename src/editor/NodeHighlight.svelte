<script lang="ts">
    import type { Outline } from "./outline";

    const HIGHLIGHT_PADDING = 20;

    export let outline: Outline;
    export let underline: Outline;

</script>

<svg class={`highlight`} 
     style={`top: ${outline.miny - HIGHLIGHT_PADDING}px; left: ${outline.minx - HIGHLIGHT_PADDING}px; `} 
     width={outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2} 
     height={outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2} 
     viewBox={`${outline.minx - HIGHLIGHT_PADDING} ${outline.miny - HIGHLIGHT_PADDING} ${outline.maxx - outline.minx + HIGHLIGHT_PADDING * 2 - 1} ${outline.maxy - outline.miny + HIGHLIGHT_PADDING * 2 - 1}`}>
     <path class="outline" d={outline.path}/>
     <path class="underline" d={underline.path}/>
</svg>

<style>
    /* Position selections relative to the node view */
    .highlight {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
        /* Pure visual indicator. No events. Otherwise it interferes with node view events. */
        pointer-events: none;
    }
    
    .highlight path {
        fill: none;
        stroke-width: var(--wordplay-border-width);
        stroke-linejoin: round;
    }

    /* Selections do stroke and background of different colors to give the node a sense of shape */
    :global(.hovered) > .highlight > .outline {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
        opacity: 0.2;
    }

    :global(.selected) > .highlight > .outline {
        stroke: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    :global(.dragged) > .highlight > .outline {
        fill: var(--wordplay-highlight);
        stroke: var(--wordplay-highlight);
    }
 
    :global(.executing) > .highlight > .outline {
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
    :global(.target) > .highlight > .outline {
        stroke: var(--wordplay-highlight);
        animation: pulse 1s infinite;
        opacity: 1.0;
    }

    :global(.match) > .highlight > .outline {
        stroke: var(--wordplay-highlight);
        animation: pulse .2s infinite;
    }

    /* Conflicts layer on top of everything else */
    :global(.primary) > .highlight > .underline {
        stroke: var(--wordplay-error);
    }

    :global(.secondary) > .highlight > .underline {
        stroke: var(--wordplay-warning);
    }

    /* Runtime exceptions shake */
    :global(.exception) > .highlight > .underline {
        animation: shake .8s cubic-bezier(.36,.07,.19,.97) infinite;
    }

</style>