<script module lang="ts">
    const Increment = 0.05;
    const MinLength = 0.15;
</script>

<script lang="ts">
    import type Bounds from './Bounds';
    import type Layout from './Layout';
    import type { Axis } from './Layout';

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

    let view: HTMLDivElement | undefined = $state(undefined);

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

    function handleKey(event: KeyboardEvent) {
        // The minimum is the previous position plus the minimum length
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
            adjuster(Math.max(previousPosition, getSplit() - Increment));
        // The maximum is 1 - minus the max length.
        else if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
            adjuster(Math.min(nextPosition, getSplit() + Increment));
    }

    function handleDrag(event: PointerEvent) {
        if (event.buttons === 0) return;

        if (axis.direction === 'x') {
            const newPosition = event.clientX / width;
            if (getSplit() !== newPosition)
                adjuster(
                    Math.max(
                        previousPosition,
                        Math.min(nextPosition, newPosition),
                    ),
                );
        } else {
            const newPosition = event.clientY / height;
            if (getSplit() !== newPosition)
                adjuster(
                    Math.max(
                        previousPosition,
                        Math.min(nextPosition, newPosition),
                    ),
                );
        }
    }
</script>

{#if bounds.length > 0 && !isFirstVisible}
    <div
        bind:this={view}
        role="slider"
        style:left="{left}px"
        style:top="{top}px"
        class:animated={!adjusting}
        tabindex="0"
        aria-valuenow={getSplit()}
        onpointerdown={(event) => {
            view?.setPointerCapture(event.pointerId);
            setAdjusting(true);
        }}
        onpointermove={handleDrag}
        onpointerup={(event) => {
            view?.releasePointerCapture(event.pointerId);
            setAdjusting(false);
        }}
        onkeydown={handleKey}
    ></div>
{/if}

<style>
    div {
        --width: 0.6em;

        position: absolute;
        cursor: pointer;
        height: var(--width);
        width: var(--width);
        text-align: center;
        border-radius: var(--width);
        transform: translate(
            calc(-1 * var(--width) / 2),
            calc(-1 * var(--width) / 2)
        );
        background: var(--wordplay-inactive-color);
    }

    .animated {
        transition:
            left ease-out,
            top ease-out,
            width ease-out,
            height ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    div:hover {
        background: var(--wordplay-foreground);
    }

    div:focus {
        outline: none;
        background: var(--wordplay-focus-color);
    }
</style>
