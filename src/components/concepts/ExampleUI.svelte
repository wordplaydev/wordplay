<script lang="ts">
    import Annotations from '@components/annotations/Annotations.svelte';
    import OutputPreview from '@components/concepts/OutputPreview.svelte';
    import {
        makeExampleProject,
        makePreviewEvaluator,
    } from '@components/concepts/previewEvaluator';
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import {
        StepBack,
        StepForward,
        StepToPresent,
        StepToStart,
        type CommandContext,
    } from '@components/editor/commands/Commands';
    import Editor from '@components/editor/Editor.svelte';
    import {
        getConceptIndex,
        IdleKind,
        setAnimatingNodes,
        setConflicts,
        setEditors,
        setEvaluation,
        setKeyboardEditIdle,
        setProject,
        setProjectCommandContext,
        setResetKeyboardIdle,
        setSelectedOutput,
        type EditorState,
    } from '@components/project/Contexts';
    import SelectedOutput from '@components/project/SelectedOutput.svelte';
    import Button from '@components/widgets/Button.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { blocks, DB, locales, Settings } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type Caret from '@edit/caret/Caret';
    import Example from '@nodes/Example';
    import type Node from '@nodes/Node';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type Spaces from '@parser/Spaces';
    import {
        BLOCK_EDITING_SYMBOL,
        CONFIRM_SYMBOL,
        COPY_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';
    import type Evaluator from '@runtime/Evaluator';
    import { onMount, untrack } from 'svelte';
    import { writable } from 'svelte/store';

    interface Props {
        example: Example;
        spaces: Spaces;
        /** True if this example should show it's value. */
        evaluated: boolean;
    }

    let { example, spaces, evaluated }: Props = $props();

    /** Whether the output preview is currently playing (vs. showing the static
     *  first frame). Examples start playing so their animations run on load
     *  rather than opening in a paused/stepping state. */
    let playing = $state(true);
    let copied = $state(false);
    let currentCaret: Caret | undefined = $state(undefined);
    let annotationsExpanded = $state(false);

    /** The code area element, and a high-water mark of its content height.
     *  Inline step values change each line's height as you step; locking the
     *  code area to the tallest height seen (never shrinking) keeps the tools
     *  row — and its step buttons — from jumping as you click repeatedly. */
    let codeEl: HTMLDivElement | undefined = $state(undefined);
    let codeFloor = $state(0);

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    // Keep track of the last example so we can remove it when the example changes.
    // svelte-ignore state_referenced_locally
    let lastExample = $state(example);

    // Derive a project from the example. Project.make always returns a
    // Project, so this is never undefined.
    let project = $derived<Project>(
        makeExampleProject(
            'example',
            example.program,
            spaces,
            $locales.getLocales(),
        ),
    );

    // Set a project context so we can do analysis and localization in the code example.
    let projectStore = writable<Project | undefined>(undefined);
    setProject(projectStore);
    $effect(() => {
        projectStore.set(project);
    });

    // Provide a conflicts context so the Editor can show conflict annotations.
    const conflictsStore = writable<
        ReturnType<Project['analyze']>['conflicts']
    >([]);
    setConflicts(conflictsStore);
    $effect(() => {
        conflictsStore.set(project ? project.analyze().conflicts : []);
    });

    // Build the evaluator in the given reactivity mode. It starts non-reactive
    // so the static first frame evaluates without claiming the mic/camera, and
    // is recreated reactive only when the creator presses play (see the $effect
    // below and makePreviewEvaluator's contract).
    function makeEvaluator(reactive: boolean): Evaluator {
        return makePreviewEvaluator(
            project,
            DB,
            $locales.getLocales(),
            reactive,
        );
    }

    // Eagerly construct the evaluator so we can populate the evaluation
    // context at script init, before child components mount. project is a
    // $derived that returns a Project synchronously here.
    // svelte-ignore state_referenced_locally
    let evaluator = $state<Evaluator>(makeEvaluator(false));

    // Isolate the evaluation and animating-nodes contexts from the parent
    // ProjectView. Without this, parent broadcasts (~60Hz while playing) and
    // parent stage animations would re-fire highlight/annotation effects in
    // every example mounted in the open guide tile.
    const evaluation = writable(getEvalContext());
    setEvaluation(evaluation);

    const animatingNodes = writable<Set<Node>>(new Set());
    setAnimatingNodes(animatingNodes);

    // Isolate the keyboardEditIdle context too: the example is read-only,
    // so its typing state should always be Idle. Without this, typing in
    // the parent's main editor flips its keyboardEditIdle to Typing, and
    // the example's Editor projectHighlights effect clears the example's
    // highlights (including outlines on animating nodes) until the parent
    // returns to Idle.
    setKeyboardEditIdle(writable(IdleKind.Idle));
    setResetKeyboardIdle(() => {});

    // Isolate selection, editor map, and command context so the example is
    // independent from the parent ProjectView. The drag store is deliberately
    // *not* isolated: sharing the parent's store lets a creator drag nodes out of
    // the read-only example into the real editor using the Editor's own drag
    // mechanism (see `dragSource` below), which preserves caret selection. Editor's
    // read-only gates keep the example from being a drop target, so a parent drag
    // never affects it.
    setSelectedOutput(new SelectedOutput());
    setEditors(writable(new Map<string, EditorState>()));

    // Only allow dragging code out when the parent index is a real editable
    // project, not the read-only guide (mirrors ConceptPreview).
    const draggable = $derived(
        indexContext !== undefined && index?.project.getName() !== 'guide',
    );

    // Provide a minimal command context bound to this example's project and
    // evaluator. CommandButtons inside the example's Annotations consult this
    // for `command.active(...)`. Optional fields (toggleMenu, setFullscreen,
    // focusOrCycleTile, etc.) are left undefined — those are project-shell
    // actions that don't apply to a read-only example.
    let exampleCommandContext = $derived<CommandContext>({
        caret: currentCaret,
        editor: false,
        project,
        locales: $locales,
        // Depend on the evaluation store (refreshed on every evaluator
        // broadcast, including each step) so CommandButton `active` predicates
        // (isInPast/isAtBeginning) recompute as the user steps. Mirrors
        // ProjectView's command context.
        evaluator: $evaluation?.evaluator ?? evaluator,
        database: DB,
        dragging: false,
        blocks: $blocks,
        view: undefined,
        zoom: undefined,
    });
    // svelte-ignore state_referenced_locally
    let commandContextState = $state({ context: exampleCommandContext });
    setProjectCommandContext(commandContextState);
    $effect(() => {
        commandContextState.context = exampleCommandContext;
    });

    function getEvalContext() {
        return {
            evaluator,
            playing: evaluator.isPlaying(),
            step: evaluator.getCurrentStep(),
            stepIndex: evaluator.getStepIndex(),
            streams: evaluator.reactions,
        };
    }

    function updateEvaluatorStores() {
        evaluation.set(getEvalContext());
    }

    // Wire the eager evaluator's store observer and seed the static first frame (no
    // auto-play). When `evaluated`, the OutputPreview below drives play/stop on this same
    // evaluator, so the Editor reflects play state. reset() handles project changes.
    // svelte-ignore state_referenced_locally
    evaluator.observe(updateEvaluatorStores);
    // svelte-ignore state_referenced_locally
    evaluator.getInitialValue();

    onMount(() => {
        return () => {
            // Remove the example from the index. We guard here because of a Svelte bug, which seems to change the prop to something else.
            if (example instanceof Example)
                index?.removeExample(example.program.expression);
            if (evaluator) {
                evaluator.stop();
                evaluator.ignore(updateEvaluatorStores);
            }
        };
    });

    function reset(hard: boolean) {
        // Don't create a new evaluator if the project is the same.
        if (!hard && evaluator && evaluator.project === project) return;

        evaluator?.ignore(updateEvaluatorStores);
        evaluator?.stop();

        if (project) {
            playing = false;
            evaluator = makeEvaluator(false);
            evaluator.observe(updateEvaluatorStores);
            evaluator.getInitialValue();
            updateEvaluatorStores();
        }
    }

    /** Reset when the project changes */
    $effect(() => {
        if (project) reset(false);
    });

    /** Switch the evaluator's reactivity to match play state. The evaluator's
     *  `reactive` flag is immutable, so we recreate it: non-reactive shows the
     *  static first frame without starting streams (no mic/camera claim);
     *  reactive starts streams — and so claims native inputs like the camera —
     *  only once the creator presses play. Mirrors OutputPreview.recreateOwn.
     *  The body is untracked so broadcasting to observers (which touch reactive
     *  state) can't re-invalidate this effect; only `playing` is a dependency. */
    $effect(() => {
        const p = playing;
        untrack(() => {
            if (!project || evaluator.reactive === p) return;
            evaluator.ignore(updateEvaluatorStores);
            evaluator.stop();
            evaluator = makeEvaluator(p);
            evaluator.observe(updateEvaluatorStores);
            // Reactive: evaluate and start streams. Non-reactive: static frame.
            if (p) evaluator.start();
            else evaluator.getInitialValue();
            updateEvaluatorStores();
        });
    });

    /** Add the example to the index when it changes so it can be dragged */
    $effect(() => {
        if (index && lastExample !== example) {
            if (lastExample) {
                index.removeExample(lastExample.program.expression);
            }
            lastExample = example;
            index.addExample(example.program.expression);
        }
    });

    // Grow the code area's floor to the tallest content height seen so inline
    // step values can't shrink it (and jump the tools row) between steps.
    $effect(() => {
        const el = codeEl;
        if (el === undefined) return;
        const observer = new ResizeObserver(() => {
            if (el.scrollHeight > codeFloor) codeFloor = el.scrollHeight;
        });
        observer.observe(el);
        return () => observer.disconnect();
    });

    // Reset the floor when the example (or code layout) changes so a new,
    // shorter example isn't stuck at a previous height.
    $effect(() => {
        example;
        $blocks;
        codeFloor = 0;
    });
</script>

<div class="container">
    <div class="example">
        <div class="code-panel" class:evaluated>
            <div class="code-row">
                <div
                    class="code"
                    bind:this={codeEl}
                    style:min-height={codeFloor ? `${codeFloor}px` : undefined}
                >
                    {#if project && evaluator}
                        <Editor
                            source={project.getMain()}
                            {project}
                            locale={null}
                            {evaluator}
                            editable={false}
                            values={evaluated}
                            dragSource={draggable}
                            bind:caretSnapshot={currentCaret}
                        />
                    {/if}
                </div>
                {#if project}
                    <Annotations
                        {project}
                        {evaluator}
                        source={project.getMain()}
                        sourceID=""
                        stepping={evaluated && $evaluation?.playing === false}
                        conflicts={$conflictsStore}
                        caret={currentCaret}
                        expanded={annotationsExpanded}
                        onToggle={() =>
                            (annotationsExpanded = !annotationsExpanded)}
                    />
                {/if}
            </div>
            <div class="tools">
                <Button
                    tip={(l) => l.ui.project.button.copy.tip}
                    action={() => {
                        copied = true;
                        toClipboard(
                            example.program.toWordplay(
                                getPreferredSpaces(example.program),
                            ),
                        );
                        setTimeout(() => (copied = false), 1000);
                    }}
                    icon={COPY_SYMBOL}
                    background={true}
                >
                    {#if copied}{CONFIRM_SYMBOL}{/if}</Button
                >

                <Mode
                    icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
                    modes={(l) => l.ui.dialog.settings.mode.blocks}
                    choice={$blocks ? 1 : 0}
                    select={(mode) => Settings.setBlocks(mode === 1)}
                    labeled={false}
                    modeLabels={false}
                />
                {#if evaluated && evaluator}
                    <!-- Play/pause drives the local `playing` state (not
                         evaluator.play/pause) so the reactive-recreate effect
                         governs streams. Step controls act on the paused,
                         non-reactive evaluator (seeded to completion, so it
                         holds the full step history). -->
                    <Button
                        tip={(l) =>
                            playing
                                ? l.ui.timeline.button.reset
                                : l.ui.timeline.button.play}
                        icon={playing ? '⏹' : '▶'}
                        background={true}
                        action={() => (playing = !playing)}
                    ></Button>
                    {#if !playing}
                        <CommandButton command={StepToStart} background />
                        <CommandButton command={StepBack} background />
                        <CommandButton command={StepForward} background />
                        <CommandButton command={StepToPresent} background />
                    {/if}
                {/if}
            </div>
        </div>
        {#if evaluated && project && evaluator}
            <div class="value">
                <OutputPreview
                    {project}
                    {evaluator}
                    {playing}
                    control={false}
                    onPlay={() => (playing = true)}
                    onStop={() => (playing = false)}
                />
            </div>
        {/if}
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        container-type: inline-size;
        /* Inline-size containment hides the children's intrinsic size from
           ancestors that size via fit-content (e.g. chat bubbles). Provide a
           fallback so those ancestors can still grow to show the example. */
        contain-intrinsic-inline-size: auto 30em;
    }

    .value {
        /* The output preview keeps a 4em floor; when the row can't fit the
           code plus a 4em-wide preview, it wraps to the next line (full
           width) instead of shrinking into an unreadable sliver. */
        flex: 1 1 4em;
        min-width: 4em;
        max-width: 30em;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .example {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: stretch;
        gap: var(--wordplay-spacing);
    }

    .code-panel {
        display: flex;
        flex-direction: column;
        /* Keep the editor readable: it never shrinks below 10em, and once the
           row can't fit a 10em editor plus the 4em preview, the preview wraps
           to the next line (full width) so the editor keeps its width. Wide
           code scrolls inside `.code` (overflow: auto) rather than forcing the
           panel wider. */
        flex: 1 1 60%;
        min-width: 20em;
    }

    .code-panel.evaluated {
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-top: none;
        overflow: hidden;
    }

    .code-row {
        border-radius: var(--wordplay-border-radius);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: none;
        display: flex;
        flex-direction: row;
        align-items: stretch;
    }

    /* Annotations sets height: 100% on its <section>, which doesn't
       resolve against this auto-sized .code-row. Switch to auto so
       align-items: stretch fills the row height instead. */
    .code-row :global(section[data-uiid='conflict']) {
        height: auto;
    }

    .code {
        min-width: 0;
        flex: 1;
    }

    .code-panel.evaluated .code {
        padding: var(--wordplay-spacing);
        overflow: auto;
        white-space: nowrap;
    }

    /* Allow iOS horizontal scroll by overriding the touch-action: none set deep in ConceptPreview */
    .code-panel.evaluated :global(.view),
    .code-panel.evaluated :global(.node) {
        touch-action: pan-x;
    }

    .tools {
        display: flex;
        flex-direction: row;
        justify-content: start;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }
</style>
