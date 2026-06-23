<script lang="ts">
    import { animationDuration } from '@db/Database';
    import { tick } from 'svelte';

    interface Props {
        // A class name to highlight.
        id: string;
        source?: boolean;
    }

    let { id, source = false }: Props = $props();

    let bounds: DOMRect | undefined = $state(undefined);

    function size(again: boolean) {
        if (id && !source) {
            // Prefer a visible target: skip off-screen copies like the OverflowToolbar's inert
            // measurement clones (which briefly carry the same data-uiid before it's stripped),
            // so the highlight never anchors to an off-screen duplicate.
            const candidates = document.querySelectorAll(`[data-uiid="${id}"]`);
            const target =
                Array.from(candidates).find(
                    (el) => el.closest('[inert], [aria-hidden="true"]') === null,
                ) ?? candidates[0];
            bounds = target?.getBoundingClientRect();
            // Try again in a few seconds, in case there's some async rendering.
            if (again) setTimeout(() => size(true), $animationDuration);
        } else bounds = undefined;
    }

    let index = $state<number | undefined>(undefined);
    let uiids = $state<string[]>([]);

    // See what highlight number this is.
    $effect(() => {
        tick().then(() => {
            uiids = Array.from(document.querySelectorAll(`.highlight.source`))
                .map((el) =>
                    el instanceof HTMLElement
                        ? el.dataset.uiidtohighlight
                        : undefined,
                )
                .filter((id) => id !== undefined);
            const match = uiids.indexOf(id);
            index = match === -1 ? undefined : match + 1;
        });
    });

    // Dual-encode each highlight with both a number and a cycling color, so a dialog reference and
    // its project-view counterpart (same id, same index) are easy to match (see issue #1014).
    const HighlightColors = ['yellow', 'orange', 'pink', 'blue', 'purple'];
    let color = $derived(
        index === undefined
            ? 'var(--wordplay-highlight-color)'
            : `var(--color-${
                  HighlightColors[(index - 1) % HighlightColors.length]
              })`,
    );
    // Number the highlights only when there's more than one, so a lone highlight stays uncluttered.
    let numbered = $derived(index !== undefined && uiids.length > 1);

    $effect(() => {
        if (id && !source) tick().then(() => size(true));
    });
</script>

<span
    class="highlight"
    class:source
    class:numbered
    data-uiidtohighlight={id}
    class:hovering={bounds !== undefined && id !== undefined}
    style:background-color={color}
    style:left={bounds ? `${bounds.left + bounds.width / 2}px` : undefined}
    style:top={bounds ? `${bounds.top + bounds.height / 2}px` : undefined}
>
    <!-- Inline (source) dots number immediately; floating dots only once positioned (bounds set). -->
    {#if numbered && (source || bounds !== undefined)}
        <span class="number">{index}</span>
    {/if}
</span>

<style>
    .highlight {
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(--wordplay-highlight-color);
        border-radius: 50%;
        width: 0.75em;
        height: 0.75em;
        margin-left: 0.1em;
        margin-right: 0.1em;
        animation-name: inline-glow;
        animation-duration: 1s;
        animation-iteration-count: infinite;

        transform-origin: center;
        position: relative;
    }

    /* Enlarge an inline (source) dot when it shows a number so the digit is legible. */
    .highlight.source.numbered {
        width: 1.4em;
        height: 1.4em;
    }

    .hovering {
        position: fixed;
        left: 0;
        top: 0;
        width: 3em;
        height: 3em;
        opacity: 0.75;
        z-index: 2;
        animation-name: glow;
        transform-origin: top left;
        pointer-events: none;
    }

    .number {
        color: #000;
        margin: 0;
        font-size: var(--wordplay-font-size);
        line-height: 1;
        font-weight: bold;
    }

    /* The inline dot is small, so size its digit relative to the dot's own em. */
    .source .number {
        font-size: 0.9em;
    }

    @keyframes glow {
        from {
            transform: scale(0.3) translate(-50%, -50%);
        }
        to {
            transform: scale(1) translate(-50%, -50%);
        }
    }

    @keyframes inline-glow {
        from {
            transform: scale(0.3);
        }
        to {
            transform: scale(1);
        }
    }
</style>
