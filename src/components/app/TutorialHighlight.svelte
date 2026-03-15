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
            bounds = document
                .querySelector(`[data-uiid="${id}"]`)
                ?.getBoundingClientRect();
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

    $effect(() => {
        if (id && !source) tick().then(() => size(true));
    });
</script>

<span
    class="highlight"
    class:source
    data-uiidtohighlight={id}
    class:hovering={bounds !== undefined && id !== undefined}
    style:left={bounds ? `${bounds.left + bounds.width / 2}px` : undefined}
    style:top={bounds ? `${bounds.top + bounds.height / 2}px` : undefined}
>
    {#if bounds}
        <!-- Only render when bounds exists -->
        {#if index !== undefined && uiids.length > 1}
            <span class="number">{index}</span>
        {/if}
    {/if}
</span>

<style>
    .highlight {
        vertical-align: middle;
        display: inline-block;
        background-color: var(--wordplay-highlight-color);
        border-radius: 50%;
        width: 0.75em;
        height: 0.75em;
        margin-left: 0.1em;
        margin-right: 0.1em;
        animation-name: inline-glow;
        animation-duration: 1s;
        animation-iteration-count: infinite;
        align-items: center;

        transform-origin: center;
        position: relative;
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
        display: flex;
        justify-content: center;
        width: 100%;
        height: 100%;
        margin: 0;
        font-size: var(--wordplay-font-size);
        line-height: 3em;
        font-weight: bold;
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
