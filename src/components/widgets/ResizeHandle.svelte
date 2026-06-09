<script lang="ts">
    /**
     * A reusable horizontal resize affordance for collapsible sidebars (the
     * Annotations and Wellspring panels, and any future sidebar). It wraps the
     * shared {@link ResizeKnob} and owns the full drag/keyboard gesture, so the
     * two sidebars can't drift. The only difference between them is which edge
     * the knob sits on and which way the sidebar grows — captured by `edge`.
     *
     * The committed width lives in the consumer's persisted setting; this
     * component reports the live (in-progress) width via `bind:live` and the
     * drag state via `bind:dragging`, and calls `commit` once when the gesture
     * ends (drag release or keyboard nudge).
     */
    import ResizeKnob, {
        type ResizeKnobEdge,
    } from '@components/widgets/ResizeKnob.svelte';

    interface Props {
        /** Which edge the knob sits on. `'right'` grows the sidebar rightward
         *  (inline-start sidebars like the Wellspring); `'left'` grows it
         *  leftward (inline-end sidebars like Annotations). */
        edge: Extract<ResizeKnobEdge, 'left' | 'right'>;
        /** The committed width, from the consumer's persisted setting. */
        width: number;
        /** Width bounds in CSS pixels. */
        min: number;
        max: number;
        /** Persist the new width — called on drag end and on keyboard nudge. */
        commit: (width: number) => void;
        /** The live width: the committed width, or the in-progress drag width.
         *  Bind it and apply it to the sidebar so the drag shows immediately. */
        live?: number;
        /** True while a drag is in progress. Bind it to suppress the sidebar's
         *  width transition during the drag for responsive feedback. */
        dragging?: boolean;
    }

    let {
        edge,
        width,
        min,
        max,
        commit,
        live = $bindable(width),
        dragging = $bindable(false),
    }: Props = $props();

    /** +1 when the knob is on the right edge (drag right grows the sidebar),
     *  −1 when on the left (drag left grows it). */
    let grow = $derived(edge === 'right' ? 1 : -1);

    /** Live width during a drag; undefined when not dragging. We don't write the
     *  setting mid-drag because `Setting.set` no-ops when the value already
     *  equals the store's, which would skip the persist on release. */
    let draggingWidth: number | undefined = $state(undefined);
    let dragStartX = 0;
    let dragStartWidth = 0;
    /** The element that captured the pointer; released in the up handler. */
    let captureEl: Element | undefined;

    // Report the live width to the consumer (committed, or the drag width).
    $effect(() => {
        live = draggingWidth ?? width;
    });

    function clamp(value: number) {
        return Math.max(min, Math.min(max, value));
    }

    function handlePointerDown(event: PointerEvent) {
        const target = event.currentTarget;
        if (!(target instanceof Element)) return;
        dragging = true;
        dragStartX = event.clientX;
        dragStartWidth = width;
        draggingWidth = width;
        target.setPointerCapture(event.pointerId);
        captureEl = target;
        event.stopPropagation();
        event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent) {
        if (!dragging) return;
        draggingWidth = clamp(
            dragStartWidth + grow * (event.clientX - dragStartX),
        );
    }

    function handlePointerUp(event: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        if (captureEl?.hasPointerCapture(event.pointerId))
            captureEl.releasePointerCapture(event.pointerId);
        captureEl = undefined;
        const final = draggingWidth;
        draggingWidth = undefined;
        // The store still holds the pre-drag value, so this persists.
        if (final !== undefined) commit(final);
    }

    /** Keyboard nudge: the grow direction maps an arrow press to a width delta;
     *  vertical movement is ignored (the sidebar only resizes horizontally). */
    function handleNudge(dx: number, _dy: number) {
        commit(clamp(width + grow * dx));
    }
</script>

<ResizeKnob
    {edge}
    active={dragging}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onnudge={handleNudge}
/>
