<script module lang="ts">
    export const CSSAlignments: Record<string, string> = {
        '<': 'left',
        '|': 'center',
        '>': 'right',
    };
</script>

<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import OutputHandles from '@components/output/OutputHandles.svelte';
    import { HorizontalLayout, layoutToCSS } from '@locale/Scripts';
    import Evaluate from '@nodes/Evaluate';
    import TextLiteral from '@nodes/TextLiteral';
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
    import { DB, Projects, locales } from '@db/Database';
    import Markup from '@nodes/Markup';
    import TextLang from '@output/TextLang';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import moveOutput from '@components/palette/editOutput';
    import {
        getProject,
        getRevealPalette,
        getSelectedOutput,
    } from '@components/project/Contexts';

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
    const revealPalette = getRevealPalette();

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

    // Selected if this phrase's value creator is selected. Gated on `editable && editing`
    // (paused) so the rotate/size handles, drag-move, and highlight only appear when the
    // view is editable and stopped — consistent with ShapeView and GroupView.
    let selected = $derived(
        editable &&
            editing &&
            phrase.value.creator instanceof Evaluate &&
            $project !== undefined &&
            selection?.includes(phrase.value.creator, $project),
    );

    // True only when this is the SOLE selected output. The rotate/resize handles and keyboard focus
    // apply to a single output — rendering handles for every output in a multi-selection makes their
    // shared focus state fight (an infinite effect loop), and multi-output rotate/resize isn't a
    // thing. Multi-selection is edited through the palette instead.
    let soleSelected = $derived(
        selected === true &&
            $project !== undefined &&
            selection?.getOutput($project).length === 1,
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

    // The creator Evaluate (narrowed), passed to the shared handles + caret selection.
    let creator = $derived(
        phrase.value.creator instanceof Evaluate
            ? phrase.value.creator
            : undefined,
    );

    $effect(() => {
        if (phrase.description) description = phrase.description.text;
        else if (frame > untrack(() => lastFrame))
            description = phrase.getDescription($locales);
        lastFrame = frame;
    });

    // Focus the phrase div when it's the SOLE selection and not in text-editing mode.
    $effect(() => {
        if (soleSelected && !entered && view)
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

    /** Double-clicking a phrase both edits its text AND opens the palette for it — matching how
     *  double-click opens the palette for shapes/groups/the stage. The phrase is already the
     *  selected output (chosen on the first pointer-down), so the palette shows its properties. */
    function handleDoubleClick(event: MouseEvent) {
        enter(event);
        revealPalette?.();
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
        aria-pressed={selectable && editing && editable ? selected : null}
        class="output phrase"
        class:selected
        tabIndex={interactive && ((!empty && selectable) || editing) ? 0 : null}
        data-id={phrase.getHTMLID()}
        data-node-id={phrase.value.creator.id}
        data-name={phrase.getName()}
        data-selectable={selectable}
        class:entered
        ondblclick={editable && interactive ? handleDoubleClick : null}
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
        {#if soleSelected && editable && !entered && creator}
            <OutputHandles
                {creator}
                {view}
                selected={soleSelected}
                name={$locales.getPlainText((l) => l.term.phrase)}
                rotation={phrase.pose.rotation ?? 0}
                size={phrase.size ?? localContext.size}
            />
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

        /* Don't let the browser synthesize weight or italic when the face
           doesn't ship the requested style — fall back to the closest real
           glyph instead. See issue #1026. */
        font-synthesis: none;

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
</style>
