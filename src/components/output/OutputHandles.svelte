<script lang="ts">
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { Projects, locales } from '@db/Database';
    import type Evaluate from '@nodes/Evaluate';
    import {
        rotatedOutput,
        resizedOutput,
    } from '@components/output/editHandles';
    import { tick } from 'svelte';

    interface Props {
        /** The output's value creator — the Evaluate whose binds we revise. */
        creator: Evaluate;
        /** The output's element, used to measure its center on gesture start. */
        view: HTMLElement | undefined;
        /** True when the output is selected (and the view is paused/editable). */
        selected: boolean;
        /** The kind name for the handles' aria-labels (e.g. "phrase", "Rectangle"). */
        name: string;
        /** Current rotation in degrees (gesture start value + keyboard step base). */
        rotation: number;
        /** Current size/scale (gesture start value + keyboard step base). */
        size: number;
        /** Keyboard resize step as a ratio (e.g. 0.1 = ±10% per press). */
        sizeIncrement?: number;
    }

    let {
        creator,
        view,
        selected,
        name,
        rotation,
        size,
        sizeIncrement = 0.1,
    }: Props = $props();

    const project = getProject();
    const selection = getSelectedOutput();

    // The handle buttons, bound so focus can be restored after the re-mount that each
    // Projects.revise() triggers. The continuous drag itself is owned by OutputView (stable);
    // these buttons only START the gesture and handle discrete keyboard steps.
    let handle = $state<HTMLButtonElement | undefined>(undefined);
    let sizeHandle = $state<HTMLButtonElement | undefined>(undefined);

    function center() {
        if (view === undefined) return undefined;
        const rect = view.getBoundingClientRect();
        return {
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2,
        };
    }

    function rotate(degrees: number) {
        if ($project === undefined) return;
        const context = $project.getNodeContext(creator);
        const next = rotatedOutput($project, creator, context, degrees);
        if (next) Projects.revise($project, [[creator, next]]);
    }

    function resize(ratio: number) {
        if ($project === undefined) return;
        const context = $project.getNodeContext(creator);
        const next = resizedOutput($project, creator, context, ratio, size);
        if (next) Projects.revise($project, [[creator, next]]);
    }

    function arrowDirection(event: KeyboardEvent) {
        return event.key === 'ArrowRight' || event.key === 'ArrowUp'
            ? 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
              ? -1
              : 0;
    }

    // Restore focus to the handles after re-mount when they were focused.
    $effect(() => {
        if (selected && selection?.rotationFocused && handle)
            setKeyboardFocus(handle, 'Restoring rotation handle focus.');
    });
    $effect(() => {
        if (selected && selection?.sizeFocused && sizeHandle)
            setKeyboardFocus(sizeHandle, 'Restoring size handle focus.');
    });

    // End the active gesture. Registered SYNCHRONOUSLY on pointerdown (below) — not via an async
    // $effect — so a quick press-release can't fire pointerup before the end listener exists and
    // leave `dragging` stuck on (which would then block all selection). Attached to window so it
    // survives the per-revise re-mount of this component, and removes itself once fired.
    function endGesture() {
        selection?.stopRotating();
        selection?.stopSizing();
        window.removeEventListener('pointerup', endGesture);
        window.removeEventListener('pointercancel', endGesture);
    }

    function listenForGestureEnd() {
        window.addEventListener('pointerup', endGesture);
        window.addEventListener('pointercancel', endGesture);
    }

    function handleRotatePointerDown(event: PointerEvent) {
        const c = center();
        if (c === undefined) return;
        event.stopPropagation();
        event.preventDefault();
        const startAngle =
            Math.atan2(event.clientY - c.cy, event.clientX - c.cx) *
            (180 / Math.PI);
        selection?.startRotating(startAngle, rotation, c.cx, c.cy);
        listenForGestureEnd();
        if (handle)
            setKeyboardFocus(handle, 'Focusing rotation handle on click.');
    }

    async function handleRotateKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
        const direction = arrowDirection(event);
        if (direction === 0) return;
        rotate(rotation + direction * 5);
        await tick();
        selection?.setRotationFocused(true);
    }

    function handleSizePointerDown(event: PointerEvent) {
        const c = center();
        if (c === undefined) return;
        event.stopPropagation();
        event.preventDefault();
        const startDistance = Math.hypot(
            event.clientY - c.cy,
            event.clientX - c.cx,
        );
        selection?.startSizing(startDistance, size, c.cx, c.cy);
        listenForGestureEnd();
        if (sizeHandle)
            setKeyboardFocus(sizeHandle, 'Focusing size handle on click.');
    }

    async function handleSizeKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
        const direction = arrowDirection(event);
        if (direction === 0) return;
        resize(1 + direction * sizeIncrement);
        await tick();
        selection?.setSizeFocused(true);
    }
</script>

{#if selected}
    <button
        bind:this={handle}
        class="rotation-handle"
        aria-label={$locales
            .concretize((l) => l.ui.output.button.rotate, { name })
            .toText()}
        onpointerdown={handleRotatePointerDown}
        onkeydown={handleRotateKeyDown}
        onfocus={() => selection?.setRotationFocused(true)}
        onblur={() => selection?.setRotationFocused(false)}>⟳</button
    >
    <button
        bind:this={sizeHandle}
        class="size-handle"
        aria-label={$locales
            .concretize((l) => l.ui.output.button.resize, { name })
            .toText()}
        onpointerdown={handleSizePointerDown}
        onkeydown={handleSizeKeyDown}
        onfocus={() => selection?.setSizeFocused(true)}
        onblur={() => selection?.setSizeFocused(false)}>⤢</button
    >
{/if}

<style>
    .rotation-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        transform: translate(50%, 50%);
        width: 1em;
        height: 1em;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85em;
        line-height: 1;
        color: var(--wordplay-highlight-color);
        cursor: grab;
        pointer-events: all;
        touch-action: none;
        /* Sit above the output's own content (e.g. a Shape's opaque fill). */
        z-index: 1;
        /* Suppress the dotted inactive-outline the global editing rule applies. */
        outline: none !important;
    }

    .rotation-handle:active {
        cursor: grabbing;
    }

    .rotation-handle:focus-visible {
        color: var(--wordplay-focus-color);
    }

    .size-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        transform: translate(-50%, 50%);
        width: 1em;
        height: 1em;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85em;
        line-height: 1;
        color: var(--wordplay-highlight-color);
        cursor: nwse-resize;
        pointer-events: all;
        touch-action: none;
        z-index: 1;
        outline: none !important;
    }

    .size-handle:focus-visible {
        color: var(--wordplay-focus-color);
    }
</style>
