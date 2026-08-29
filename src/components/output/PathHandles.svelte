<script lang="ts">
    import {
        getAnnouncer,
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { SnapIncrement } from '@components/output/snap';
    import { locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import {
        getPathPoints,
        withInsertedPathPoint,
        withMovedPathPoint,
        withoutPathPoint,
    } from '@edit/output/editShape';
    import Evaluate from '@nodes/Evaluate';
    import type { Path } from '@output/Output/Shape/Path';
    import { PX_PER_METER } from '@output/Output/outputToCSS';
    import { tick } from 'svelte';

    interface Props {
        /** The Shape's creator, whose `form` input holds the path being edited. */
        creator: Evaluate;
        /** The rendered path, which says where its points are and how big its box is. */
        path: Path;
    }

    let { creator, path }: Props = $props();

    const project = getProject();
    const announce = getAnnouncer();
    const selection = getSelectedOutput();

    /** The path's own Evaluate, inside the Shape. */
    let form = $derived.by(() => {
        if ($project === undefined) return undefined;
        const context = $project.getNodeContext(creator);
        const given = creator.getInput(
            $project.shares.output.Shape.inputs[0],
            context,
        );
        return given instanceof Evaluate ? given : undefined;
    });

    /**
     * The points as written, or undefined when any of them is computed. A path whose places a
     * program works out is still drawn and still moved as a whole; it just has no handles,
     * because dragging one would have to overwrite the expression that put it there.
     */
    let points = $derived(
        $project === undefined || form === undefined
            ? undefined
            : getPathPoints($project, form, $project.getNodeContext(creator)),
    );

    /**
     * Which handle is focused. Kept on the selection rather than here, because every revision
     * re-mounts these handles along with the shape: local state would be gone by the time
     * focus needed restoring, so a moved point lost focus and the next key went nowhere.
     */
    let focused = $derived(selection?.pointFocused);
    let buttons = $state<(HTMLButtonElement | undefined)[]>([]);

    $effect(() => {
        const button = focused === undefined ? undefined : buttons[focused];
        if (button && document.activeElement !== button)
            setKeyboardFocus(button, 'Restoring path point focus.');
    });

    /** Where a point sits inside the shape's box, in the box's own pixels. */
    function offset(point: { x: number; y: number }) {
        return {
            left: (point.x - path.getLeft()) * PX_PER_METER,
            top: -(point.y - path.getTop()) * PX_PER_METER,
        };
    }

    function say(message: string) {
        if (announce && $announce)
            $announce('selection', $locales.getLanguages()[0], message);
    }

    /** Revise the Shape with a new form, and say what happened. */
    function revise(revised: Evaluate | undefined, message: string) {
        if ($project === undefined || revised === undefined) return false;
        const context = $project.getNodeContext(creator);
        Projects.revise($project, [
            [
                creator,
                creator.withBindAs(
                    $project.shares.output.Shape.inputs[0],
                    revised,
                    context,
                ),
            ],
        ]);
        say(message);
        return true;
    }

    function movePoint(index: number, dx: number, dy: number) {
        if (
            $project === undefined ||
            form === undefined ||
            points === undefined
        )
            return;
        const from = points[index];
        if (from === undefined) return;
        const to = {
            x: Math.round((from.x + dx) * 100) / 100,
            y: Math.round((from.y + dy) * 100) / 100,
        };
        revise(
            withMovedPathPoint(
                $project,
                form,
                $project.getNodeContext(creator),
                index,
                to,
            ),
            // The coordinate, not "moved": an arrow pressed twice would otherwise be the same
            // words twice and be heard once.
            $locales
                .concretize((l) => l.ui.output.point.moved, {
                    number: index + 1,
                    place: `${to.x}m ${to.y}m`,
                })
                .toText(),
        );
    }

    async function insertAfter(index: number) {
        if ($project === undefined || form === undefined) return;
        const added = withInsertedPathPoint(
            $project,
            form,
            $project.getNodeContext(creator),
            index,
            $locales,
        );
        if (added === undefined) return;
        if (
            revise(
                added.form,
                $locales
                    .concretize((l) => l.ui.output.point.added, {
                        number: added.index + 1,
                    })
                    .toText(),
            )
        ) {
            // Follow the new point, so a run of Enters walks along the path rather than
            // subdividing the same span over and over.
            selection?.setPointFocused(added.index);
            await tick();
        }
    }

    function remove(index: number) {
        if ($project === undefined || form === undefined) return;
        const fewer = withoutPathPoint(
            $project,
            form,
            $project.getNodeContext(creator),
            index,
        );
        // Refused: a path can't shrink below a line. Say so rather than doing nothing.
        if (fewer === undefined) {
            say($locales.getPrimaryPlainText((l) => l.ui.output.point.last));
            return;
        }
        revise(
            fewer,
            $locales
                .concretize((l) => l.ui.output.point.removed, {
                    number: index + 1,
                })
                .toText(),
        );
        selection?.setPointFocused(Math.max(0, index - 1));
    }

    /**
     * Start a point drag. The continuous move is OutputView's, not this component's: every
     * revision re-mounts these handles, so a drag driven from here dropped its own listeners
     * after the first frame and the point crawled a fraction of the way. The rotate and resize
     * handles are split the same way, for the same reason.
     */
    function startDrag(event: PointerEvent, index: number) {
        if (points === undefined) return;
        const from = points[index];
        if (from === undefined || !(event.currentTarget instanceof HTMLElement))
            return;
        selection?.startDraggingPoint(
            index,
            from,
            event.clientX,
            event.clientY,
        );
        listenForEnd();
        event.stopPropagation();
        // Otherwise the press falls through to the stage, which selects or pans; and
        // preventDefault suppresses the focus a click would give the button, so take it
        // explicitly or the next arrow key moves the whole shape instead of this point.
        event.preventDefault();
        setKeyboardFocus(event.currentTarget, 'Focusing a path point.');
        selection?.setPointFocused(index);
    }

    /** End the gesture. Registered synchronously on pointerdown — not from an effect — so a
     *  quick press and release can't finish before the listener exists and leave the drag on. */
    function listenForEnd() {
        const end = () => {
            selection?.stopDraggingPoint();
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
    }

    function handleKey(event: KeyboardEvent, index: number) {
        // Tab belongs to keyboard navigation, and is never swallowed here.
        if (event.key === 'Tab') return;
        const move: Record<string, [number, number]> = {
            ArrowLeft: [-SnapIncrement, 0],
            ArrowRight: [SnapIncrement, 0],
            ArrowUp: [0, SnapIncrement],
            ArrowDown: [0, -SnapIncrement],
        };
        const delta = move[event.key];
        if (delta !== undefined) {
            event.preventDefault();
            event.stopPropagation();
            movePoint(index, delta[0], delta[1]);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            insertAfter(index);
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            event.stopPropagation();
            remove(index);
        }
    }
</script>

{#if points !== undefined}
    <!-- One focusable button per point, absolutely positioned inside the shape's box. Real
         buttons rather than drawn dots because that is what makes the whole thing reachable by
         keyboard and nameable to a screen reader — the same choice the character editor's path
         handles make. -->
    {#each points as point, index (index)}
        {@const at = offset(point)}
        <button
            bind:this={buttons[index]}
            type="button"
            class="point-handle"
            data-handle="point-{index}"
            style:left="{at.left}px"
            style:top="{at.top}px"
            aria-label={$locales
                .concretize((l) => l.ui.output.point.label, {
                    number: index + 1,
                    count: points.length,
                    place: `${point.x}m ${point.y}m`,
                })
                .toText()}
            onfocus={() => selection?.setPointFocused(index)}
            onkeydown={(event) => handleKey(event, index)}
            onpointerdown={(event) => startDrag(event, index)}
        ></button>
    {/each}
{/if}

<style>
    /* Sized in em off the parent's font size, like the rotate and resize handles: these sit
       inside the shape's transformed box, so a handle in pixels shrinks with the camera until
       a zoomed-out path's points can't be hit. `font-size` first, because a button's UA default
       (13.3px Arial) doesn't inherit the stage's — sizing in em without it measures the wrong
       em. Smaller than those two handles, since there is one per point rather than one per
       shape. A ring, so the line it sits on stays visible while it's aimed. */
    .point-handle {
        position: absolute;
        font-size: 0.5em;
        width: 1em;
        height: 1em;
        margin-left: -0.5em;
        margin-top: -0.5em;
        padding: 0;
        border-radius: 50%;
        border: max(1px, 0.15em) solid var(--wordplay-background);
        background: var(--wordplay-highlight-color);
        cursor: grab;
        pointer-events: all;
        touch-action: none;
        z-index: 2;
        /* Suppress the dotted inactive-outline the global editing rule applies. */
        outline: none !important;
    }

    .point-handle:focus {
        box-shadow: 0 0 0 var(--wordplay-focus-width)
            var(--wordplay-focus-color);
    }
</style>
