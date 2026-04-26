<script module lang="ts">
    export const CSSAlignments: Record<string, string> = {
        '<': 'left',
        '|': 'center',
        '>': 'right',
    };
</script>

<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { HorizontalLayout, layoutToCSS } from '@locale/Scripts';
    import Evaluate from '@nodes/Evaluate';
    import NumberLiteral from '@nodes/NumberLiteral';
    import TextLiteral from '@nodes/TextLiteral';
    import Unit from '@nodes/Unit';
    import {
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
        toOutputTransform,
    } from '@output/outputToCSS';
    import type Phrase from '@output/Phrase';
    import type Place from '@output/Place';
    import type RenderContext from '@output/RenderContext';
    import { tick, untrack } from 'svelte';
    import { DB, Projects, locales } from '../../db/Database';
    import Markup from '../../nodes/Markup';
    import TextLang from '../../output/TextLang';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import moveOutput from '../palette/editOutput';
    import { getProject, getSelectedOutput } from '../project/Contexts';

    interface Props {
        phrase: Phrase;
        place: Place;
        focus: Place;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        editing: boolean;
        frame: number;
    }

    let {
        phrase,
        place,
        focus,
        interactive,
        parentAscent,
        context,
        editable,
        editing,
        frame,
    }: Props = $props();

    const selection = getSelectedOutput();
    const project = getProject();

    // Compute a local context based on size and font.
    let localContext = $derived(phrase.getRenderContext(context));

    // Visible if z is ahead of focus and font size is greater than 0.
    let visible = $derived(
        place.z > focus.z && (phrase.size ?? localContext.size > 0),
    );

    // Get the phrase's text in the preferred language
    let text = $derived(phrase.getLocalizedTextOrDoc());
    let empty = $derived(phrase.isEmpty());
    let selectable = $derived(phrase.selectable && !empty);

    // The text field, if being edited.
    let input: HTMLInputElement | undefined = $state();

    // Selected if this phrase's value creator is selected
    let selected = $derived(
        phrase.value.creator instanceof Evaluate &&
            $project !== undefined &&
            selection?.includes(phrase.value.creator, $project),
    );

    let view = $state<HTMLDivElement | undefined>(undefined);

    // Text-editing mode is derived from the external SelectedOutput store, NOT local state.
    // GroupView keys PhraseView by child.getName(), which returns `${creator.id}-${count}`.
    // After each Projects.revise() the creator ID changes, so Svelte destroys and re-mounts
    // this component — resetting any local $state. By deriving from selection.phrase.index
    // (which lives in SelectedOutput across re-mounts) the input stays visible across keystrokes.
    //
    // The explicit `getPhrase() !== null` guard is required: when getPhrase() returns null
    // (single-click sets selection.phrase = null), `null?.index` is `undefined`, and
    // `undefined !== null` is true — without the guard every single-click would enter editing.
    let entered = $derived(
        selected &&
            editable &&
            selection !== undefined &&
            selection.getPhrase() !== null &&
            selection.getPhrase()?.index !== null,
    );

    let metrics = $derived(phrase.getMetrics(localContext));

    let description: string | null = $state(null);
    let lastFrame = $state(0);

    // The rotation handle button, bound so focus can be restored after re-mount.
    let handle = $state<HTMLButtonElement | undefined>(undefined);

    // The size handle button, bound so focus can be restored after re-mount.
    let sizeHandle = $state<HTMLButtonElement | undefined>(undefined);

    function setRotation(degrees: number) {
        if (
            $project === undefined ||
            !(phrase.value.creator instanceof Evaluate)
        )
            return;
        const ctx = $project.getNodeContext(phrase.value.creator);
        const rotationBind = $project.shares.output.Phrase.inputs[11];
        const rounded = Math.round(((degrees % 360) + 360) % 360);
        Projects.revise($project, [
            [
                phrase.value.creator,
                phrase.value.creator.withBindAs(
                    rotationBind,
                    NumberLiteral.make(rounded, Unit.create(['°'])),
                    ctx,
                ),
            ],
        ]);
    }

    function setSize(sizeInMeters: number) {
        if (
            $project === undefined ||
            !(phrase.value.creator instanceof Evaluate)
        )
            return;
        const ctx = $project.getNodeContext(phrase.value.creator);
        const sizeBind = $project.shares.output.Phrase.inputs[1];
        const clamped = Math.max(0.1, Math.round(sizeInMeters * 10) / 10);
        Projects.revise($project, [
            [
                phrase.value.creator,
                phrase.value.creator.withBindAs(
                    sizeBind,
                    NumberLiteral.make(clamped, Unit.meters()),
                    ctx,
                ),
            ],
        ]);
    }

    // Attach window-level drag handlers while a size drag is in progress.
    $effect(() => {
        const drag = selection?.sizeDragging;
        if (!drag || !selected) return;

        const { startDistance, startSize } = drag;
        function onMove(e: PointerEvent) {
            if (!view || startDistance === 0) return;
            const rect = view.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const currentDistance = Math.hypot(e.clientY - cy, e.clientX - cx);
            setSize(startSize * (currentDistance / startDistance));
        }

        function onUp() {
            selection?.stopSizing();
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    });

    // Restore focus to the size handle after re-mount when it was focused.
    $effect(() => {
        if (selected && editable && !entered && selection?.sizeFocused && sizeHandle)
            setKeyboardFocus(sizeHandle, 'Restoring size handle focus.');
    });

    function handleSizePointerDown(event: PointerEvent) {
        if (!view) return;
        event.stopPropagation();
        event.preventDefault();
        const rect = view.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const startDistance = Math.hypot(event.clientY - cy, event.clientX - cx);
        selection?.startSizing(startDistance, phrase.size ?? localContext.size);
        if (sizeHandle) setKeyboardFocus(sizeHandle, 'Focusing size handle on click.');
    }

    async function handleSizeKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
        const current = phrase.size ?? localContext.size;
        const increment = 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
            setSize(current + increment);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
            setSize(current - increment);
        else return;
        await tick();
        selection?.setSizeFocused(true);
    }

    // Attach window-level drag handlers while a rotation drag is in progress.
    // Using window listeners (instead of pointer capture) lets the drag survive
    // the component re-mount that Projects.revise() triggers.
    $effect(() => {
        const drag = selection?.rotationDragging;
        if (!drag || !selected) return;

        const { startAngle, startDegrees } = drag;
        function onMove(e: PointerEvent) {
            if (!view) return;
            const rect = view.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const currentAngle =
                Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
            setRotation(startDegrees + (currentAngle - startAngle));
        }

        function onUp() {
            selection?.stopRotating();
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    });

    // Restore focus to the rotation handle after re-mount when it was focused.
    $effect(() => {
        if (
            selected &&
            editable &&
            !entered &&
            selection?.rotationFocused &&
            handle
        )
            setKeyboardFocus(handle, 'Restoring rotation handle focus.');
    });

    function handleRotatePointerDown(event: PointerEvent) {
        if (!view) return;
        event.stopPropagation();
        event.preventDefault();
        const rect = view.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const startAngle =
            Math.atan2(event.clientY - cy, event.clientX - cx) *
            (180 / Math.PI);
        selection?.startRotating(startAngle, phrase.pose.rotation ?? 0);
        if (handle) setKeyboardFocus(handle, 'Focusing rotation handle on click.');
    }

    async function handleRotateKeyDown(event: KeyboardEvent) {
        event.stopPropagation();
        const current = phrase.pose.rotation ?? 0;
        const increment = 5;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
            setRotation(current + increment);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
            setRotation(current - increment);
        else return;
        // The revision destroys and re-mounts this component (GroupView keys by
        // creator ID). The re-mount triggers blur on the old handle, clearing
        // rotationFocused. Waiting for the DOM to settle then re-setting it lets
        // the restoration effect on the new instance refocus the handle.
        await tick();
        selection?.setRotationFocused(true);
    }

    $effect(() => {
        if (phrase.description) description = phrase.description.text;
        else if (frame > untrack(() => lastFrame))
            description = phrase.getDescription($locales);
        lastFrame = frame;
    });

    // Focus the phrase div when selected but not in text-editing mode.
    $effect(() => {
        if (selected && !entered && view)
            setKeyboardFocus(view, 'focused on selected phrase');
    });

    // After each re-mount (new component instance from key change) or text change,
    // restore focus and cursor position on the input. Reading `text` ensures this
    // effect re-runs whenever the phrase content changes after Projects.revise().
    $effect(() => {
        text;
        if (editable && entered && input) {
            const phraseSelection = selection?.getPhrase() ?? undefined;
            if (
                phraseSelection !== undefined &&
                phraseSelection !== null &&
                phraseSelection.index !== null
            ) {
                input.setSelectionRange(
                    phraseSelection.index,
                    phraseSelection.index,
                );
            }
            setKeyboardFocus(input, 'Restoring phrase text editor focus.');
        }
    });

    async function enter(event: MouseEvent | KeyboardEvent) {
        if (entered) {
            event.stopPropagation();
            return;
        }
        select(0); // sets selection.phrase.index = 0, making `entered` true
        event.stopPropagation();
        // Wait for the input to render, then focus it.
        await tick();
        if (input) setKeyboardFocus(input, 'Entering phrase text editor.');
    }

    function select(index: number | null) {
        if (selection === undefined) return;
        selection.setPhrase({
            name: phrase.getName(),
            index,
        });
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Enter text-editing mode when Enter is pressed while selected but not editing.
        if (
            selected &&
            !entered &&
            event.key === 'Enter' &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey
        ) {
            enter(event);
            return;
        }

        // Move the phrase with arrow keys when not in text-editing mode.
        if (
            $project === undefined ||
            selection?.isEmpty() ||
            entered ||
            !event.key.startsWith('Arrow') ||
            !(phrase.value.creator instanceof Evaluate)
        )
            return;

        // Place must be a Place to move it, so creator don't accidently delete a compelx expression.
        const mapping = phrase.value.creator.getInput(
            $project.shares.output.Phrase.inputs[3],
            $project.getNodeContext(phrase.value.creator),
        );
        if (
            !(
                mapping === undefined ||
                (mapping instanceof Evaluate &&
                    mapping.is(
                        $project.shares.output.Place,
                        $project.getNodeContext(phrase.value.creator),
                    ))
            )
        )
            return;

        const increment = 0.5;
        let horizontal =
            event.key === 'ArrowLeft'
                ? -1 * increment
                : event.key === 'ArrowRight'
                  ? increment
                  : 0;
        let vertical =
            event.key === 'ArrowUp'
                ? 1 * increment
                : event.key === 'ArrowDown'
                  ? -1 * increment
                  : 0;

        select(null);

        moveOutput(
            DB,
            $project,
            [phrase.value.creator],
            $locales,
            horizontal,
            vertical,
            true,
        );
    }

    async function handleInput(event: { currentTarget: HTMLInputElement }) {
        if ($project === undefined || selection?.isEmpty()) return;
        if (event.currentTarget === null) return;
        const newText = event.currentTarget.value;
        const originalTextValue = phrase.getText();
        if (originalTextValue === undefined) return;

        // Reset the cache for proper layout.
        phrase.resetMetrics();

        if (event.currentTarget.selectionStart !== null)
            select(event.currentTarget.selectionStart);

        Projects.revise($project, [
            [
                phrase.value.creator,
                phrase.value.creator.replace(
                    originalTextValue.creator,
                    TextLiteral.make(newText),
                ),
            ],
        ]);
    }
</script>

{#if visible}
    <div
        bind:this={view}
        role={selectable ? 'button' : null}
        aria-hidden={empty ? 'true' : null}
        aria-disabled={!selectable}
        aria-label={description}
        aria-roledescription={!selectable
            ? $locales.getPlainText((l) => l.term.phrase)
            : null}
        class="output phrase"
        class:selected
        tabIndex={interactive && ((!empty && selectable) || editing) ? 0 : null}
        data-id={phrase.getHTMLID()}
        data-node-id={phrase.value.creator.id}
        data-name={phrase.getName()}
        data-selectable={selectable}
        class:entered
        ondblclick={editable && interactive ? enter : null}
        onkeydown={editable && interactive ? handleKeyDown : null}
        style:font-family={getFaceCSS(localContext.face)}
        style:font-size={getSizeCSS(localContext.size)}
        style:background={phrase.background?.toCSS() ?? null}
        style:color={getColorCSS(phrase.getFirstRestPose(), phrase.pose)}
        style:opacity={getOpacityCSS(phrase.getFirstRestPose(), phrase.pose)}
        style:width="{metrics.width}px"
        style:height="{metrics.height}px"
        style:line-height="{phrase.wrap !== undefined ||
        phrase.direction !== HorizontalLayout
            ? metrics.ascent + metrics.descent
            : metrics.height}px"
        style:transform={toOutputTransform(
            phrase.getFirstRestPose(),
            phrase.pose,
            place,
            focus,
            parentAscent,
            metrics,
        )}
        style:writing-mode={layoutToCSS(phrase.direction)}
        style:text-shadow={phrase.aura
            ? `${getSizeCSS(phrase.aura.offsetX ?? 0)} ${getSizeCSS(
                  phrase.aura.offsetY ?? 0,
              )} ${getSizeCSS(phrase.aura.blur ?? 0)} ${
                  phrase.aura.color?.toCSS() ??
                  getColorCSS(phrase.getFirstRestPose(), phrase.pose) ??
                  ''
              }`
            : null}
        style:white-space={phrase.wrap !== undefined ? 'normal' : 'nowrap'}
        style:text-align={phrase.alignment === undefined
            ? null
            : CSSAlignments[phrase.alignment]}
    >
        {#if selected && editable && !entered}
            <button
                bind:this={handle}
                class="rotation-handle"
                aria-label={$locales.getPlainText(
                    (l) => l.ui.output.button.rotate,
                )}
                onpointerdown={handleRotatePointerDown}
                onkeydown={handleRotateKeyDown}
                onfocus={() => selection?.setRotationFocused(true)}
                onblur={() => selection?.setRotationFocused(false)}>⟳</button
            >
            <button
                bind:this={sizeHandle}
                class="size-handle"
                aria-label={$locales.getPlainText(
                    (l) => l.ui.output.button.resize,
                )}
                onpointerdown={handleSizePointerDown}
                onkeydown={handleSizeKeyDown}
                onfocus={() => selection?.setSizeFocused(true)}
                onblur={() => selection?.setSizeFocused(false)}>⤢</button
            >
        {/if}
        {#if entered}
            <!-- Stop propagation on key down so that only the input handles it when focused. -->
            <input
                type="text"
                value={text}
                bind:this={input}
                oninput={handleInput}
                onkeydown={(event) => event.stopPropagation()}
                onpointerdown={(event) => event.stopPropagation()}
                style:width="{Math.max(
                    10,
                    phrase.getMetrics(localContext, false).width,
                )}px"
                style:height="{metrics.height}px"
                style:line-height="{metrics.height}px"
            />
        {:else if text instanceof TextLang}{text.text}{:else if text instanceof Markup}<MarkupHTMLView
                markup={text.asLine()}
                inline
            />{/if}
    </div>
{/if}

<style>
    .phrase {
        /* The position of a phrase is absolute relative to its group. */
        position: absolute;
        left: 0;
        top: 0;

        /** Wrap long words that don't fit on a line */
        overflow-wrap: normal;

        /* This disables translation around the center; we want to translate around the focus.*/
        transform-origin: 0 0;

        pointer-events: none;
    }

    :global(.editing) .phrase {
        min-width: 8px;
        min-height: 8px;
        pointer-events: all;
    }

    .phrase[data-selectable='true'] {
        cursor: pointer;
        pointer-events: all;
    }

    .phrase > :global(.light) {
        font-weight: 300;
    }

    .phrase > :global(.extra) {
        font-weight: 900;
    }

    :global(.stage.editing.interactive) .selected {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
    }

    /* In selected-but-not-editing mode, show a move cursor to signal draggability. */
    :global(.stage.editing.interactive) .selected:not(.entered) {
        cursor: move;
    }

    :global(.stage.editing.interactive) :not(:global(.selected)) {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-inactive-color);
    }

    input {
        font-family: inherit;
        font-weight: inherit;
        font-style: inherit;
        font-size: inherit;
        color: inherit;
        border: inherit;
        background: inherit;
        padding: 0;
        border-bottom: var(--wordplay-highlight-color) solid
            var(--wordplay-focus-width);
        outline: none;
        opacity: inherit;
        line-height: inherit;
        text-shadow: inherit;
        min-width: 1em;
    }

    input:focus {
        color: inherit;
    }

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
        /* Suppress the dotted inactive-outline that the global editing rule
           applies to any descendant without .selected. */
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
        outline: none !important;
    }

    .size-handle:focus-visible {
        color: var(--wordplay-focus-color);
    }
</style>
