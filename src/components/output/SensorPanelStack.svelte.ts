/** Coordinator for stacking multiple sensor monitor panels vertically without overlap.
 *  Tracks registration order, measures heights, and computes offsets for proper stacking. */

export class SensorPanelStack {
    order: string[] = $state([]);
    heights: Record<string, number> = $state({});

    register(id: string) {
        if (!this.order.includes(id)) {
            this.order = [...this.order, id];
        }
    }

    unregister(id: string) {
        this.order = this.order.filter((o) => o !== id);
    }

    reportHeight(id: string, height: number) {
        this.heights = { ...this.heights, [id]: height };
    }

    /** Total height (+ gaps) of all panels stacked above `id`. */
    offsetAbove(id: string, gap: number): number {
        const i = this.order.indexOf(id);
        if (i <= 0) return 0;
        return this.order
            .slice(0, i)
            .reduce((sum, o) => sum + (this.heights[o] ?? 0) + gap, 0);
    }
}
