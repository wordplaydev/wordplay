<script lang="ts">
    import {
        HighlightTypes,
        type HighlightType,
    } from '@components/editor/highlights/Highlights';
    import type { Outline } from '@components/editor/highlights/outline';

    /* Slack around the outline for effects that paint outside the path. An SVG root
       clips at its bounds, and the selected output's glow reaches roughly the blur
       radius plus its travel offset past the stroke, which 20px would slice off. Only
       the SVG canvas grows; path coordinates are absolute, so no geometry moves. */
    const HIGHLIGHT_PADDING = 48;

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
    // Each highlight type belongs to exactly one layer (above/below), so an
    // outline whose types are all in the *other* layer would render two empty,
    // invisible SVGs here. Editor renders every outline in both layers, so this
    // skip halves the painted SVG count — significant when a name's `related`
    // highlight lights up every use (many overlays at once).
    let hasContent = $derived(filteredClasses.length > 0);
</script>

{#if hasContent}
    <svg
        class={`highlight outline ${filteredClasses}`}
        class:ignored
        class:below={!above}
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
        class:below={!above}
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
{/if}

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

    /* BELOW-layer highlights (fills like `animating`/`evaluating` that the token
       text must paint OVER) sit at a negative z so they render above the
       editor's background but under ALL in-flow content. Token views are plain
       (non-positioned) inline boxes — making each one a positioned box was a
       large WebKit layout cost — so without this the positioned SVG would paint
       on top of their text and hide it. The editor isolates its stacking
       context so the negative z can't escape beneath anything outside it. */
    .highlight.below {
        z-index: -1;
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

    /* Search matches draw a stroke around the matched substring. Stroke (not
       fill) so they stay visible over opaque token blocks in blocks mode and
       never occlude text. */
    .search.outline path {
        stroke: var(--wordplay-error);
        fill: none;
    }

    /* The code the message being written is about. A stroke rather than a fill,
       for the same reason search matches are: it must stay legible over opaque
       token blocks and never sit on top of the text. Gold, which is what this
       app uses for "someone is pointing at this", and dashed so it can't be
       mistaken for the caret's own solid outline. */
    .referenced.outline path {
        stroke: var(--color-gold-text);
        stroke-dasharray: 4 3;
        fill: none;
    }

    /* Definitions and uses get hover feedback without border */
    .related:not(:global(.selected)).outline path {
        stroke: none;
        fill: var(--wordplay-hover-light);
    }

    /* Selected output: the same border and travelling glow the stage draws, traced
       around the node's own tokens rather than boxed. The glow is a drop-shadow
       because box-shadow can't apply to a path; the base rule carries a static one so
       selection stays visible when --animation-factor is 0. See app.html. */
    .outline.output path {
        stroke: var(--selection-color);
        stroke-width: var(--selection-ring-width);
        /* Dashed, so a selected output can't be mistaken for the caret's
           solid highlight — they otherwise draw the same shape in nearly the
           same colour around the same tokens. */
        stroke-dasharray: var(--selection-dash);
        fill: none;
        filter: drop-shadow(
            0 0 var(--selection-glow-blur) var(--selection-color)
        );
        animation: selectionglowdrop calc(var(--animation-factor) * 3s)
            ease-in-out infinite;
        /* GPU-isolate the infinite animation, as elsewhere in this file. */
        will-change: filter;
    }

    .outline.selected path {
        stroke: var(--wordplay-highlight-color);
        stroke-width: var(--wordplay-focus-width);
        fill: var(--wordplay-hover-light);
    }

    .delimiter.outline path {
        stroke: var(--wordplay-highlight-color);
        stroke-width: var(--wordplay-border-width);
        animation: calc(250ms * var(--animation-factor)) linear wave infinite;
        fill: var(--wordplay-hover);
        transform-origin: center;
        /* Promote to its own compositing layer so this infinite transform
           animation runs on the GPU instead of re-rasterizing the whole
           (viewport-sized) overlay every frame. The matched-delimiter highlight
           appears whenever the caret is near a bracket, so on a bracket-dense
           program it was a continuous, editor-wide composite/paint cost. */
        will-change: transform;
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
        /* GPU-isolate the infinite transform animation (see .delimiter above). */
        will-change: transform;
    }

    /* A note sounding right now. Deliberately still: the note's own starting
       and stopping is the motion, and a flash driven at note rate would be a
       photosensitivity risk at fast tempos. Distinct from animating, which is
       the same colour but shifts — so a phrase that animates while a melody
       plays doesn't read as one thing. */
    .outline.sounding path {
        fill: var(--wordplay-sounding-color);
        stroke: var(--wordplay-sounding-color);
    }

    /* In blocks mode, the SVG fill would be hidden behind the block's own
       opaque background, so we treat animating differently: outline the
       block in the evaluation color and animate the block itself with the
       same shift. The text inside keeps its normal color (the SVG isn't
       visible in this mode, so making text white would just be unreadable). */
    :global(.node-view.block.animating) {
        box-shadow: 0 0 0 var(--wordplay-focus-width)
            var(--wordplay-evaluation-color);
        animation: shift ease-in-out infinite;
        animation-duration: calc(var(--animation-factor) * 1s);
        /* GPU-isolate the infinite transform animation (see .delimiter above). */
        will-change: transform;
    }

    /* Same treatment for the evaluating (current step) highlight, which was
       otherwise invisible in blocks mode: static, matching text mode where
       evaluating holds still and animating moves. */
    :global(.node-view.block.evaluating) {
        box-shadow: 0 0 0 var(--wordplay-focus-width)
            var(--wordplay-evaluation-color);
    }

    /* And for sounding, for the same reason. Static here too. */
    :global(.node-view.block.sounding) {
        box-shadow: 0 0 0 var(--wordplay-focus-width)
            var(--wordplay-sounding-color);
    }

    /* Make the text legible inside animating/evaluating/dragging nodes —
       only in text mode (i.e. NOT inside .block), where the pink SVG fill
       is what's behind the text. In blocks mode the block keeps its normal
       fill and the text should keep its normal color too. */
    :global(
        .node-view:not(.block).evaluating .token-view,
        .node-view:not(.block).animating .token-view,
        .node-view:not(.block).sounding .token-view,
        .node-view:not(.block).dragging .token-view,
        .token-view:not(.block).evaluating,
        .token-view:not(.block).animating,
        .token-view:not(.block).sounding,
        .token-view:not(.block).dragging
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
    .underline.major path,
    .underline.major {
        stroke: var(--wordplay-error);
    }

    .underline.minor path,
    .underline.minor {
        stroke: var(--wordplay-warning);
        /* Round dots, per the line vocabulary in app.html: error orange and
           warning gold collapse under red-green color blindness, and warning
           gold is also the selection hue, so line style — not hue — is what
           says "minor". Dotted, not dashed: dashed means selected output. */
        stroke-dasharray: var(--minor-severity-dots);
        stroke-linecap: round;
    }

    /* Emphasized conflict: wiggle both the outline and underline left-right.
       transform-box keeps the transform origin on the path's own box so the
       translate reads as a small horizontal nudge. */
    .attention path {
        transform-box: fill-box;
        animation: shake calc(var(--animation-factor) * 500ms) linear infinite;
        /* GPU-isolate the infinite transform animation (see .delimiter above). */
        will-change: transform;
    }

    .underline.exception path {
        stroke: var(--wordplay-error);
        /* No fill — for text mode the underline path is open M…L… segments
           where fill is invisible anyway, and in blocks mode the path is a
           closed rounded rect around the block, where filling would obscure
           the block's contents. */
        fill: none;
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
</style>
