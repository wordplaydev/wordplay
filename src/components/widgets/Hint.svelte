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
    import { browser } from '$app/environment';
    import { getTip } from '@components/project/Contexts';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { onDestroy } from 'svelte';

    interface Props {
        /** True when this Hint is rendered inside a <dialog>. Only shows tooltips whose
         * target is also inside a dialog; the global Hint (inDialog=false) handles the rest. */
        inDialog?: boolean;
    }

    let { inDialog = false }: Props = $props();

    const tip = getTip();

    const bounds = $state<{
        top: number | undefined;
        left: number | undefined;
    }>({
        top: 0,
        left: 0,
    });

    let width = $state<number | undefined>(undefined);
    let height = $state<number | undefined>(undefined);

    function update() {
        // If there's a target and it's not in the document anymore, hide the tooltip.
        if (target && !document.contains(target)) tip.hide();
    }

    let observer = $state.raw(
        browser ? new MutationObserver(update) : undefined,
    );

    const target = $derived(tip.getView());

    // Only show this Hint instance when the target's dialog-membership matches ours:
    // the dialog Hint shows targets inside a dialog; the global Hint shows all others.
    const shouldShow = $derived(
        target !== undefined &&
            inDialog === (target.closest('dialog') !== null),
    );

    onDestroy(() => {
        observer?.disconnect();
    });

    $effect(() => {
        if (target && shouldShow) {
            // Listen to the document children changes so we hear about the target being removed.
            observer?.observe(document.body, {
                subtree: true,
                childList: true,
            });

            if (width === undefined || height === undefined) {
                bounds.top = 0;
                bounds.left = 0;
                return;
            }

            // If the target is inside a dialog, position relative to that dialog.
            const dialog = inDialog
                ? (target.closest('dialog') as HTMLDialogElement | null)
                : null;
            const rect = target.getBoundingClientRect();

            // Convert the target rect into the same coordinate system as the
            // hint's positioning context (the dialog, or the viewport).
            const targetRect = dialog
                ? (() => {
                      const dr = dialog.getBoundingClientRect();
                      return {
                          left: rect.left - dr.left + dialog.scrollLeft,
                          top: rect.top - dr.top + dialog.scrollTop,
                          width: rect.width,
                          height: rect.height,
                      };
                  })()
                : {
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                  };

            const container = dialog
                ? { width: dialog.clientWidth, height: dialog.clientHeight }
                : { width: window.innerWidth, height: window.innerHeight };

            const { left, top } = placeNearTarget(
                targetRect,
                { width, height },
                container,
            );
            bounds.top = top;
            bounds.left = left;
        }
    });
</script>

<!-- Show if there's a target and this hint's dialog scope matches the target's. -->
{#if shouldShow}
    <!-- Hide it from screen readers. They get aria-labels. -->
    <div
        class="hint"
        role="presentation"
        bind:clientWidth={width}
        bind:clientHeight={height}
        class:visible={width !== undefined && width > 0}
        style:left={`${bounds.left ?? 0}px`}
        style:top={`${bounds.top ?? 0}px`}>{tip.getText()}</div
    >
{/if}

<style>
    .hint {
        position: absolute;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
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
        opacity: 0;
    }

    .hint.visible {
        opacity: 1;
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
