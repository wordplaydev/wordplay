<script module lang="ts">
    const Increment = 0.05;
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
        adjuster: (split: number) => void;
    }

    let { axis, index, layout, adjuster }: Props = $props();

    let bounds = $derived(getBounds());
    let left = $derived(
        bounds.length === 0
            ? undefined
            : axis.direction === 'y'
              ? bounds[0].left + bounds.reduce((sum, b) => sum + b.width, 0) / 2
              : bounds[0].left + bounds[0].width,
    );
    let top = $derived(
        bounds.length === 0
            ? undefined
            : axis.direction === 'y'
              ? bounds[0].top + bounds[0].height
              : bounds[0].top +
                bounds.reduce((sum, b) => sum + b.height, 0) / 2,
    );

    function getBounds(): Bounds[] {
        // Find the kinds from the axis.
        const kind = axis.splits[index].id;
        const nextKind = axis.splits[index + 1].id;

        const kindTiles = kind
            .map((k) =>
                typeof k === 'number'
                    ? layout.getSource(k)
                    : layout.getTileWithID(k),
            )
            .filter((k) => k !== undefined)
            .filter((k) => k.isExpanded());
        const nextKindTiles = nextKind
            .map((k) =>
                typeof k === 'number'
                    ? layout.getSource(k)
                    : layout.getTileWithID(k),
            )
            .filter((k) => k !== undefined);
        return kindTiles.length > 0 &&
            nextKindTiles !== undefined &&
            kindTiles.some((k) => k.isExpanded()) &&
            nextKindTiles.some((k) => k.isExpanded())
            ? kindTiles.map((k) => k.bounds).filter((k) => k !== undefined)
            : [];
    }

    function getSplit(): number {
        return axis.splits[index].proportion;
    }

    function handleKey(event: KeyboardEvent) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
            adjuster(Math.max(0.2, getSplit() - Increment));
        else if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
            adjuster(Math.min(0.8, getSplit() + Increment));
    }

    function handlePointer(event: PointerEvent) {}
</script>

{#if bounds.length > 0}
    <div
        role="slider"
        style:left="{left}px"
        style:top="{top}px"
        tabindex="0"
        aria-valuenow={getSplit() ?? 0.5}
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
