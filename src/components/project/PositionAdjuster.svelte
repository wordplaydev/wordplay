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
    }

    let { axis, index, layout, adjuster }: Props = $props();

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
        const previousPosition =
            (axis.positions[index - 1]?.position ?? 0) + MinLength;
        const nextPosition =
            (axis.positions[index + 1]?.position ?? 1) - MinLength;

        // The minimum is the previous position plus the minimum length
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
            adjuster(Math.max(previousPosition, getSplit() - Increment));
        // The maximum is 1 - minus the max length.
        else if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
            adjuster(Math.min(nextPosition, getSplit() + Increment));
    }

    function handlePointer(event: PointerEvent) {}
</script>

{#if bounds.length > 0 && !isFirstVisible}
    <div
        role="slider"
        style:left="{left}px"
        style:top="{top}px"
        tabindex="0"
        aria-valuenow={getSplit()}
        onpointerdown={handlePointer}
        onkeydown={handleKey}
    ></div>
{/if}

<style>
    div {
        position: absolute;
        cursor: pointer;
        height: 0.5em;
        width: 0.5em;
        text-align: center;
        border-radius: 0.5em;
        transition:
            left ease-out,
            top ease-out,
            width ease-out,
            height ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transform: translate(-0.25em, -0.25em);
        background: var(--wordplay-foreground);
    }

    div:focus {
        outline: none;
        background: var(--wordplay-focus-color);
    }
</style>
