<script module lang="ts">
    export class ActiveHint {
        private text: string = $state('');
        private view: HTMLElement | undefined = $state(undefined);

        show(text: string, view: HTMLElement) {
            this.text = text;
            this.view = view;
        }

        hide() {
            this.text = '';
            this.view = undefined;
        }

        getText() {
            return this.text;
        }

        getView() {
            return this.view;
        }

        isActive() {
            return this.view !== undefined;
        }
    }
</script>

<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { onDestroy } from 'svelte';

    const tip = getTip();

    const bounds = $state<{
        top: number | undefined;
        left: number | undefined;
    }>({
        top: 0,
        left: 0,
    });

    let width = $state(0);
    let height = $state(0);

    let view = $state<HTMLDivElement | undefined>(undefined);

    function update() {
        // If there's a target and it's not in the document anymore, hide the tooltip.
        if (target && !document.contains(target)) tip.hide();
    }

    let observer = $state.raw(new MutationObserver(update));

    const target = $derived(tip.getView());

    onDestroy(() => {
        observer.disconnect();
    });

    $effect(() => {
        if (target) {
            // Listen to the document children changes so we hear about the target being removed.
            observer.observe(document.body, {
                subtree: true,
                childList: true,
            });

            const dialog =
                view?.parentElement instanceof HTMLDialogElement
                    ? view.parentElement
                    : undefined;

            const rect = target.getBoundingClientRect();

            // Get the container bounds
            const containerWidth = dialog
                ? dialog.clientWidth
                : window.innerWidth;
            const containerHeight = dialog
                ? dialog.clientHeight
                : window.innerHeight;

            let newLeft = 0;
            let newTop = 0;

            newTop = rect.top - height;
            newLeft = rect.left + (rect.width - width) / 2;

            // If it's a dialog, account for the relative positioning.
            if (dialog) {
                const parentRect = dialog.getBoundingClientRect();
                newLeft = newLeft - parentRect.left;
                newTop = newTop - parentRect.top;
            }

            if (newLeft < 0) newLeft = 0;
            if (newLeft + width + 5 > containerWidth)
                newLeft = containerWidth - width - 5;
            if (newTop < 0) {
                newTop = rect.top;
                newLeft = rect.right;
            }
            if (newTop + height + 5 > containerHeight)
                newTop = containerHeight - height - 5;

            bounds.top = newTop;
            bounds.left = newLeft;
        }
    });
</script>

<!-- Show if there's a target and either this hint is in a dialog that contains the target, or its not in a dialog -->
{#if target}
    <!-- Hide it from screen readers. They get aria-labels. -->
    <div
        class="hint"
        role="presentation"
        bind:this={view}
        bind:clientWidth={width}
        bind:clientHeight={height}
        style:left={bounds.left !== undefined ? `${bounds.left}px` : undefined}
        style:top={bounds.top !== undefined ? `${bounds.top}px` : undefined}
        >{tip.getText()}</div
    >
{/if}

<style>
    .hint {
        position: absolute;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        font-size: var(--wordplay-small-font-size);
        font-family: var(--wordplay-app-font);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        max-width: 12em;
        user-select: none;
        pointer-events: none;
        z-index: 3;
        animation: appear 0.25s ease-in-out;
        box-shadow: 2px 2px 5px var(--wordplay-chrome);
    }

    @keyframes appear {
        0% {
            opacity: 0;
        }
        60% {
            opacity: 0;
        }
        80% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }
</style>
