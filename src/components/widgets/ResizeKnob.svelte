<script module lang="ts">
    /** Edge / corner of the parent element the knob sits on. */
    export type ResizeKnobEdge =
        | 'top'
        | 'top-left'
        | 'left'
        | 'bottom-left'
        | 'bottom'
        | 'bottom-right'
        | 'right'
        | 'top-right';
</script>

<script lang="ts">
    /**
     * The single, shared visual + interactive resize handle used by every
     * resizable component (annotations sidebar, project tiles). It owns:
     *
     *   - size (12 px circle), color (`var(--wordplay-inactive-color)` →
     *     `var(--wordplay-highlight-color)` on hover / focus / active drag)
     *   - the direction-appropriate `cursor` (ew / ns / nwse / nesw-resize)
     *   - focus semantics (`tabindex="0"`, `role="separator"`, aria-orientation)
     *   - keyboard accessibility (arrow keys nudge via `onnudge(dx, dy)`)
     *
     * Pointer events are forwarded to the consumer via `onpointerdown` /
     * `onpointermove` / `onpointerup` props. Consumers that want a draggable
     * knob call `setPointerCapture` in their `onpointerdown` handler — the
     * knob itself doesn't capture, so consumers stay in control of whether
     * the drag is delta-based (Annotations) or coordinate-based (TileView).
     *
     * Important for visual parity: the parent element *must not* clip the
     * knob with `overflow: hidden`. The knob is centered on the parent's
     * border line (half outside the parent's box) so it can be visually
     * "on" the edge. Wrap the parent in a non-clipping container when
     * needed (see `.annotations-frame` and `.tile-content`).
     */

    interface Props {
        /** Where the knob sits on the parent's border. */
        edge: ResizeKnobEdge;
        /** True while a drag is in progress — brightens the knob. */
        active?: boolean;
        /** Forwarded to the knob element. */
        onpointerdown?: (event: PointerEvent) => void;
        /** Forwarded to the knob element. */
        onpointermove?: (event: PointerEvent) => void;
        /** Forwarded to the knob element. */
        onpointerup?: (event: PointerEvent) => void;
        /**
         * Called when the user presses an arrow key while the knob is
         * focused. `dx` and `dy` are signed pixel deltas (left/up are
         * negative, right/down are positive); consumers apply them however
         * is appropriate for their edge direction.
         */
        onnudge?: (dx: number, dy: number) => void;
        /** Pixel step per arrow keypress; defaults to 16. */
        keyStep?: number;
        /** Aria-label override (default: a direction-based label). */
        label?: string;
    }

    let {
        edge,
        active = false,
        onpointerdown,
        onpointermove,
        onpointerup,
        onnudge,
        keyStep = 16,
        label,
    }: Props = $props();

    function cursorFor(e: ResizeKnobEdge): string {
        if (e === 'top' || e === 'bottom') return 'ns-resize';
        if (e === 'left' || e === 'right') return 'ew-resize';
        if (e === 'top-left' || e === 'bottom-right') return 'nwse-resize';
        return 'nesw-resize';
    }

    function orientationFor(e: ResizeKnobEdge): 'horizontal' | 'vertical' {
        return e === 'top' || e === 'bottom' ? 'horizontal' : 'vertical';
    }

    function defaultLabel(e: ResizeKnobEdge): string {
        return `Resize ${e.replace('-', ' ')}`;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (onnudge === undefined) return;
        let dx = 0;
        let dy = 0;
        switch (event.key) {
            case 'ArrowLeft':
                dx = -keyStep;
                break;
            case 'ArrowRight':
                dx = keyStep;
                break;
            case 'ArrowUp':
                dy = -keyStep;
                break;
            case 'ArrowDown':
                dy = keyStep;
                break;
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
        onnudge(dx, dy);
    }
</script>

<!-- The role="separator" is the implicit interactive role for a draggable
     divider, but Svelte's a11y linter still flags <div role="separator"
     tabindex="0"> with pointer/keyboard listeners. We disable the two
     applicable warnings inline rather than wrapping in a button (which has
     its own a11y semantics that don't match a resize handle). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="resize-knob {edge}"
    class:active
    style:cursor={cursorFor(edge)}
    role="separator"
    aria-orientation={orientationFor(edge)}
    aria-label={label ?? defaultLabel(edge)}
    tabindex="0"
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    onkeydown={handleKeyDown}
></div>

<style>
    .resize-knob {
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--wordplay-inactive-color);
        pointer-events: auto;
        z-index: 3;
        transition: background 100ms ease-out;
    }

    /* Single hover / focus / active style — same color in every state where
       the knob is "engaged". This is the only place either consumer can
       change the knob's appearance. */
    .resize-knob.active {
        background: var(--wordplay-highlight-color);
        outline: none;
    }

    .resize-knob:focus-visible {
        /* Add a focus ring in addition to the color change, since the knob is
           small and might be hard to see when it changes color. */
        background: var(--wordplay-focus-color);
    }

    /* Centered on the parent's border line via translate. The consumer is
       responsible for ensuring its parent doesn't clip via `overflow: hidden`. */
    .resize-knob.top-left {
        top: 0;
        left: 0;
        transform: translate(-50%, -50%);
    }
    .resize-knob.top-right {
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
    }
    .resize-knob.bottom-left {
        bottom: 0;
        left: 0;
        transform: translate(-50%, 50%);
    }
    .resize-knob.bottom-right {
        bottom: 0;
        right: 0;
        transform: translate(50%, 50%);
    }
    .resize-knob.top {
        top: 0;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .resize-knob.bottom {
        bottom: 0;
        left: 50%;
        transform: translate(-50%, 50%);
    }
    .resize-knob.left {
        top: 50%;
        left: 0;
        transform: translate(-50%, -50%);
    }
    .resize-knob.right {
        top: 50%;
        right: 0;
        transform: translate(50%, -50%);
    }
</style>
