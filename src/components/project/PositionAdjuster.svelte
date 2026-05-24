<script module lang="ts">
    const Increment = 0.05;
    const MinLength = 0.15;
</script>

<script lang="ts">
    import type Bounds from '@components/project/Bounds';
    import type Layout from '@components/project/Layout';
    import type { Axis } from '@components/project/Layout';
    import ResizeKnob from '@components/widgets/ResizeKnob.svelte';

    interface Props {
        /** The axis that this adjuster is on **/
        axis: Axis;
        /** The index of the split being adjusted */
        index: number;
        layout: Layout;
        adjuster: (position: number) => void;
        /** Whether a position adjuster is being dragged */
        adjusting: boolean;
        /** Function to set whether rapid adjusting is happening, to avoid throttling CSS transitions. */
        setAdjusting: (state: boolean) => void;
        /** The canvas width */
        width: number;
        /** The canvas height */
        height: number;
    }

    let {
        axis,
        index,
        layout,
        adjuster,
        width,
        height,
        adjusting,
        setAdjusting,
    }: Props = $props();

    let isFirstVisible = $derived(
        axis.positions.findIndex((pos) =>
            layout.tiles.some((t) => t.isExpanded() && pos.id.includes(t.kind)),
        ) === index,
    );
    let bounds = $derived(getBounds());
    let left = $derived(
        bounds.length === 0
            ? undefined
            : axis.direction === 'y'
              ? (bounds[0].left +
                    Math.max.apply(
                        undefined,
                        bounds.map((b) => b.left + b.width),
                    )) /
                2
              : bounds[0].left,
    );
    let top = $derived(
        bounds.length === 0
            ? undefined
            : axis.direction === 'y'
              ? bounds[0].top
              : (bounds[0].top +
                    Math.max.apply(
                        undefined,
                        bounds.map((b) => b.top + b.height),
                    )) /
                2,
    );

    let previousPosition = $derived(
        (axis.positions[index - 1]?.position ?? 0) + MinLength,
    );
    let nextPosition = $derived(
        (axis.positions[index + 1]?.position ?? 1) - MinLength,
    );

    function getBounds(): Bounds[] {
        // The first group in the axes doesn't get an adjuster.
        if (index === 0) return [];

        // Get the kinds specified on the axis.
        const kinds = axis.positions[index].id;

        // Get the bounds of the expanded tiles of the specified kinds in the layout.
        return layout.tiles
            .filter((t) => t.isExpanded() && kinds.includes(t.kind))
            .map((t) => t.bounds)
            .filter((b) => b !== undefined);
    }

    function getSplit(): number {
        return axis.positions[index].position;
    }

    let captureEl: Element | undefined;

    function handlePointerDown(event: PointerEvent) {
        const target = event.currentTarget;
        if (!(target instanceof Element)) return;
        target.setPointerCapture(event.pointerId);
        captureEl = target;
        setAdjusting(true);
    }

    function handleDrag(event: PointerEvent) {
        if (event.buttons === 0) return;

        // Find the bounds of the project view, so we can offset.
        const projectBounds = document
            .getElementsByClassName('project')[0]
            ?.getBoundingClientRect();

        if (axis.direction === 'x') {
            const newPosition = (event.clientX - projectBounds.left) / width;
            if (getSplit() !== newPosition)
                adjuster(
                    Math.max(
                        previousPosition,
                        Math.min(nextPosition, newPosition),
                    ),
                );
        } else {
            const newPosition = (event.clientY - projectBounds.top) / height;
            if (getSplit() !== newPosition)
                adjuster(
                    Math.max(
                        previousPosition,
                        Math.min(nextPosition, newPosition),
                    ),
                );
        }
    }

    function handlePointerUp(event: PointerEvent) {
        if (captureEl?.hasPointerCapture(event.pointerId))
            captureEl.releasePointerCapture(event.pointerId);
        captureEl = undefined;
        setAdjusting(false);
    }

    /**
     * Keyboard nudge from the knob. The knob fires `(dx, dy)` in pixels;
     * we map the axis-relevant delta to a fractional split adjustment
     * sized to a comparable fraction of the canvas (matches the historical
     * 0.05 increment when the user holds an arrow key for several steps).
     */
    function handleNudge(dx: number, dy: number) {
        const delta = axis.direction === 'x' ? dx : dy;
        if (delta === 0) return;
        const span = axis.direction === 'x' ? width : height;
        if (span === 0) return;
        const next = getSplit() + delta / span;
        adjuster(Math.max(previousPosition, Math.min(nextPosition, next)));
    }

    // Step the knob by ~5% of the relevant canvas dimension so arrow-key
    // adjustments feel the same magnitude as the legacy PositionAdjuster's
    // Increment (0.05), rather than the knob's pixel default.
    let knobKeyStep = $derived(
        Math.max(
            1,
            Math.round((axis.direction === 'x' ? width : height) * Increment),
        ),
    );
</script>

{#if bounds.length > 0 && !isFirstVisible}
    <div
        class="anchor"
        class:animated={!adjusting}
        style:left="{left}px"
        style:top="{top}px"
    >
        <ResizeKnob
            edge={axis.direction === 'x' ? 'left' : 'top'}
            active={adjusting}
            onpointerdown={handlePointerDown}
            onpointermove={handleDrag}
            onpointerup={handlePointerUp}
            onnudge={handleNudge}
            keyStep={knobKeyStep}
        />
    </div>
{/if}

<style>
    .anchor {
        /* Zero-size positioning anchor at the split point. ResizeKnob is
           absolutely positioned within it and translates -50%, -50% so it
           sits centered on (left, top). */
        position: absolute;
        width: 0;
        height: 0;
    }

    .animated {
        transition:
            left ease-out,
            top ease-out;
        transition-duration: calc(var(--animation-factor) * 100ms);
    }
</style>
