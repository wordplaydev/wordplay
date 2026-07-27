<script module lang="ts">
    import getConceptName from '@locale/getConceptName';
    /** Map Wordplay's alignment glyphs to logical CSS text-align values so a
     *  phrase's text aligns to the start/end of its own reading direction —
     *  '<' (start) and '>' (end) flip automatically under an RTL `dir`. */
    export const CSSAlignments: Record<string, string> = {
        '<': 'start',
        '|': 'center',
        '>': 'end',
    };
</script>

<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import OutputHandles from '@components/output/OutputHandles.svelte';
    import { layoutToCSS } from '@locale/Scripts';
    import Evaluate from '@nodes/Evaluate';
    import TextLiteral from '@nodes/TextLiteral';
    import {
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
        toOutputTransform,
    } from '@output/Output/outputToCSS';
    import type Phrase from '@output/Output/Phrase';
    import type Place from '@output/Place/Place';
    import type RenderContext from '@output/RenderContext';
    import { tick, untrack } from 'svelte';
    import { DB, Projects, locales } from '@db/Database';
    import Markup from '@nodes/Markup';
    import TextValue from '@values/TextValue';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import { getTransitionIndex } from '@output/animation/getTextTransition';
    import {
        getTransitionSteps,
        keyOf,
        reprOf,
        sameKind,
    } from '@output/animation/getTransitionSteps';
    import {
        changingToTextEffect,
        styleToEasingFunction,
    } from '@output/animation/OutputAnimation';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import PlainTextView from '@components/output/PlainTextView.svelte';
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
        /** Whether the creator can select this output for inspection (edit or step mode). */
        inspectable?: boolean;
        editing: boolean;
        frame: number;
        /** Render flat (screen-fixed, no perspective/z) — used by the overlay/HUD layer. */
        flat?: boolean;
    }

    let {
        phrase,
        place,
        focus,
        interactive,
        parentAscent,
        context,
        editable,
        inspectable = editable,
        editing,
        frame,
        flat = false,
    }: Props = $props();

    const selection = getSelectedOutput();
    const project = getProject();
    const revealPalette = getRevealPalette();

    // Compute a local context based on size and font.
    let localContext = $derived(phrase.getRenderContext(context));

    // Visible if z is ahead of focus and font size is greater than 0. Flat
    // (HUD) output ignores z, so it's always in front.
    let visible = $derived(
        (flat || place.z > focus.z) && (phrase.size ?? localContext.size > 0),
    );

    // Get the phrase's text in the preferred language
    let text = $derived(phrase.getLocalizedTextOrDoc());
    let empty = $derived(phrase.isEmpty());
    let selectable = $derived(phrase.selectable && !empty);

    // The locale carried by the phrase's text/markup value, surfaced to the DOM
    // as `lang` (a11y, font fallback, hyphenation) and `dir` (inline direction
    // from the language's dominant script). Null when the value is untagged.
    let textLanguage = $derived(phrase.text.language);
    let textLang = $derived(textLanguage?.getBCP47() ?? null);
    let textDir = $derived.by(() => {
        const code = textLanguage?.getLanguageCode();
        return code ? getLanguageDirection(code) : null;
    });

    // The language and region whose characters the random text effect cycles:
    // the text's own tag when it has one, otherwise the program's primary locale.
    let effectLanguage = $derived(
        textLanguage?.getLanguageCode() ?? $locales.getLanguages()[0],
    );
    let effectRegion = $derived(
        textLanguage?.getLanguageCode() !== undefined
            ? textLanguage?.getRegionText()
            : $locales.getPreferredLocales()[0]?.regions[0],
    );

    // What's currently shown. While text is morphing this holds an intermediate
    // step (a truncated string or Markup); otherwise it equals reprOf(text).
    // Driven reactively so Svelte owns the DOM (the old engine mutated innerHTML,
    // which broke Svelte).
    let displayed = $state<string | Markup>(untrack(() => reprOf(text)));
    // The last text value we committed to (null on first render).
    let prev: TextValue | Markup | null = untrack(() => text);
    // The in-flight requestAnimationFrame handle, if a transition is animating.
    let rafHandle: number | undefined;
    // Bumped on every text change and on destroy, so an async transition setup
    // (the random effect's pool load) discards itself when superseded.
    let transitionToken = 0;

    // The text field, if being edited.
    let input: HTMLInputElement | undefined = $state();

    // Selected if this phrase's value creator is selected. Gated on `inspectable && editing`
    // (paused) so the highlight only appears when the creator can select output and the
    // view is stopped — consistent with ShapeView and GroupView.
    let selected = $derived(
        inspectable &&
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

    // The phrase's explicit writing layout, or the context's inherited one.
    let effectiveLayout = $derived(
        phrase.direction ? layoutToCSS(phrase.direction) : localContext.layout,
    );

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

    /** Cancel any transition animation in flight and invalidate any pending
     *  async step building. */
    function cancelTransition() {
        transitionToken++;
        if (rafHandle !== undefined) {
            cancelAnimationFrame(rafHandle);
            rafHandle = undefined;
        }
    }

    /** Play a precomputed step sequence over `totalMs`, eased by the phrase's
     *  style, landing exactly on `target`. */
    function animateTransition(
        steps: (string | Markup)[],
        target: string | Markup,
        totalMs: number,
    ) {
        const easing = styleToEasingFunction($locales, phrase.style);
        const start = performance.now();
        const step = (now: number) => {
            const progress = Math.min(1, (now - start) / totalMs);
            const index = getTransitionIndex(steps.length, easing(progress));
            displayed = index < 0 ? target : steps[index];
            if (progress < 1) rafHandle = requestAnimationFrame(step);
            else {
                displayed = target;
                rafHandle = undefined;
            }
        };
        rafHandle = requestAnimationFrame(step);
    }

    // Animate the displayed text when the phrase's text changes between evaluations
    // and its `changing` input names a text effect (issue #74); without one, text
    // changes are instant. Step building lives in getTransitionSteps; here we just
    // gate, build, and play the steps over the phrase's duration, eased by its
    // style. Reactive `displayed` state keeps Svelte in control of the DOM.
    $effect(() => {
        // Re-run whenever the phrase's text changes.
        const current = text;

        untrack(() => {
            cancelTransition();

            const target = reprOf(current);
            const committed = prev === null ? null : reprOf(prev);
            prev = current;

            const factor = localContext.animationFactor;
            const effect = changingToTextEffect($locales, phrase.changing);
            // Only animate a real same-kind text change while playing, not editing,
            // and only when the phrase names a text effect with `changing`.
            // Cross-kind (plain↔markup) and formatting-only changes swap instantly.
            if (
                committed === null ||
                !sameKind(committed, target) ||
                keyOf(committed) === keyOf(target) ||
                factor <= 0 ||
                phrase.duration <= 0 ||
                effect === undefined ||
                entered
            ) {
                displayed = target;
                return;
            }

            // Where to morph from: continue from what's on screen if it's the same
            // kind (a transition was mid-flight), otherwise from the last committed text.
            const from = sameKind(displayed, target) ? displayed : committed;
            const totalMs = phrase.duration * factor * 1000;

            // Build the steps (async only for the random effect's lazily
            // fetched character data); the token discards the result if a
            // newer change or destroy supersedes it. Random cycles roughly
            // every 50ms regardless of duration.
            const token = transitionToken;
            getTransitionSteps(effect, from, target, {
                stepCount: Math.max(8, Math.min(60, Math.round(totalMs / 50))),
                language: effectLanguage,
                region: effectRegion,
            }).then((steps) => {
                if (token !== transitionToken) return;
                animateTransition(steps, target, totalMs);
            });
        });

        // Cancel any in-flight transition on destroy.
        return cancelTransition;
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
            ? $locales.getPlainText((l) => getConceptName(l, 'phrase'))
            : null}
        aria-pressed={selectable && editing && inspectable ? selected : null}
        class="output phrase"
        class:selected
        tabIndex={interactive && ((!empty && selectable) || editing) ? 0 : null}
        data-id={phrase.getHTMLID()}
        data-node-id={phrase.value.creator.id}
        data-name={phrase.getName()}
        data-selectable={selectable}
        lang={textLang}
        dir={textDir}
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
        effectiveLayout !== 'horizontal-tb'
            ? metrics.ascent + metrics.descent
            : metrics.height}px"
        style:transform={toOutputTransform(
            phrase.getFirstRestPose(),
            phrase.pose,
            place,
            focus,
            parentAscent,
            metrics,
            undefined,
            flat,
        )}
        style:writing-mode={effectiveLayout}
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
                name={$locales.getPlainText((l) => getConceptName(l, 'phrase'))}
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
        {:else if typeof displayed === 'string'}<PlainTextView
                text={displayed}
            />{:else}<MarkupHTMLView markup={displayed} inline />{/if}
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
