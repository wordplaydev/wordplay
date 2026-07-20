<script lang="ts">
    import { getInteractive } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import { type Snippet } from 'svelte';

    interface Props {
        /** Total number of units that exist; caps growth and drives the "…N" remaining count. */
        count: number;
        /** Content-aware default window size (see fitCount). */
        start: number;
        /** Renders exactly `limit` units; the caller slices its items and adds separators. */
        content: Snippet<[number]>;
        /** Where the trailing controls render: inline (a span) or as a table row. */
        layout?: 'inline' | 'row';
        /** Column span for the controls cell when layout is 'row'. */
        columns?: number;
    }

    let {
        count,
        start,
        content,
        layout = 'inline',
        columns = 1,
    }: Props = $props();

    const interactive = getInteractive();

    // How many units are currently shown. Grows on "more", resets on "collapse".
    // svelte-ignore state_referenced_locally
    let shown = $state(start);

    // Re-seed `shown` when the default changes (e.g. a runtime value mutates),
    // but not on unrelated re-renders — otherwise a user's reveal would be lost.
    // svelte-ignore state_referenced_locally
    let lastStart = start;
    $effect(() => {
        if (start !== lastStart) {
            lastStart = start;
            shown = start;
        }
    });

    // In a static (non-interactive) context, only ever show the default window.
    let visible = $derived(
        interactive.interactive ? shown : Math.min(start, count),
    );
    let remaining = $derived(count - visible);
    let canExpand = $derived(interactive.interactive && shown < count);
    let canCollapse = $derived(interactive.interactive && shown > start);
    let hasTrailer = $derived(
        interactive.interactive ? canExpand || canCollapse : remaining > 0,
    );

    function more() {
        // Reveal another budget-sized window (next-budget-window growth).
        shown = Math.min(count, shown + Math.max(1, start));
    }

    function collapse() {
        shown = start;
    }
</script>

{#snippet trailer()}{#if interactive.interactive}{#if canExpand}<Button
                tip={(l) => l.ui.source.toggle.expandSequence.off}
                background="circular"
                action={more}>+{remaining}</Button
            >{/if}
        {#if canCollapse}
            <Button
                tip={(l) => l.ui.source.toggle.expandSequence.on}
                background="circular"
                action={collapse}>▴</Button
            >{/if}{:else}<span class="static">+{remaining}</span>{/if}{/snippet}

{@render content(visible)}{#if hasTrailer}{#if layout === 'row'}<tr
            ><td colspan={columns} class="controls">{@render trailer()}</td></tr
        >{:else}{@render trailer()}{/if}{/if}

<style>
    .static {
        font-size: var(--wordplay-small-font-size);
        white-space: nowrap;
        user-select: none;
    }

    .controls {
        text-align: start;
    }
</style>
