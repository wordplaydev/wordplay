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
        sizeToPx,
        toOutputTransform,
    } from '@output/Output/outputToCSS';
    import {
        BubbleSideNames,
        FallbackSide,
        type BubbleSide,
    } from '@output/Bubble/Bubble';
    import type Phrase from '@output/Output/Phrase';
    import type Place from '@output/Place/Place';
    import type RenderContext from '@output/RenderContext';
    import { tick, untrack } from 'svelte';
    import { scale } from 'svelte/transition';
    import { animationDuration, DB, locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import TextValue from '@values/TextValue';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import AnimatedText from '@components/output/AnimatedText.svelte';
    import moveOutputWithKey, {
        arrowMove,
    } from '@components/output/keyboardMove';
    import {
        getAnnouncer,
        getPaletteOpen,
        getProject,
        getRevealPalette,
        getSelectedOutput,
        getStageGrid,
        getStageScene,
    } from '@components/project/Contexts';

    interface Props {
        phrase: Phrase;
        place: Place;
        focus: Place;
        interactive: boolean;
        parentAscent: number;
        context: RenderContext;
        editable: boolean;
        /** Whether the creator can select this output for inspection (edit or debug mode). */
        inspectable?: boolean;
        editing: boolean;
        frame: number;
        /** Render flat (screen-fixed, no perspective/z) — used by the overlay/HUD layer. */
        flat?: boolean;
        /** The side this phrase's container chose for its bubble, when it has one
         *  to choose. Omitted for output with no container to decide — output on
         *  its way off stage — which falls back to the bubble's own side. */
        bubbleSide?: BubbleSide | undefined;
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
        bubbleSide = undefined,
    }: Props = $props();

    const selection = getSelectedOutput();
    const project = getProject();
    const revealPalette = getRevealPalette();
    const paletteOpen = getPaletteOpen();
    const announce = getAnnouncer();
    const grid = getStageGrid();
    const stageScene = getStageScene();

    // Compute a local context based on size and font.
    let localContext = $derived(phrase.getRenderContext(context));

    // Visible if z is ahead of focus and font size is greater than 0. Flat
    // (HUD) output ignores z, so it's always in front.
    let visible = $derived(
        (flat || place.z > focus.z) && (phrase.size ?? localContext.size > 0),
    );

    // Get the phrase's text in the preferred language
    let text = $derived(phrase.getLocalizedTextOrDoc());
    /** What the inline text field edits: the characters themselves, never their source form.
     *  `TextValue.toString()` is `toWordplay()`, which is quoted, so handing the value itself
     *  to the field showed the quotes and re-quoted the text on every keystroke (#1189 fallout).
     *  Empty for markup, which `enter()` refuses to open the field for. */
    let editableText = $derived(text instanceof TextValue ? text.text : '');
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
            ? // Resolved rather than raw: a tag may spell its region by name
              // (`/es-México`), and only the code names a CLDR data directory.
              textLanguage?.getRegionCodes().at(0)
            : $locales.getPreferredLocales()[0]?.regions[0],
    );

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

    // Focus the phrase div when it's the SOLE selection and not in text-editing mode — but only
    // when the creator selected it on the stage. The editor's caret also selects output (so the
    // palette follows along), and taking focus for that would pull the creator out of the editor
    // mid-edit, turning their next arrow key into an output move.
    $effect(() => {
        if (soleSelected && !entered && selection?.shouldTakeFocus() && view)
            setKeyboardFocus(view, 'focused on selected phrase');
    });

    // After each re-mount (new component instance from key change) or text change,
    // restore focus and cursor position on the input. Reading `editableText` ensures this
    // effect re-runs whenever the phrase content changes after Projects.revise(). Every
    // keystroke re-mounts this component — a revise gives the creator Evaluate a new node id,
    // which changes the name GroupView keys its children by — so this is what makes the field
    // behave like a text field at all.
    $effect(() => {
        editableText;
        if (editable && entered && input) {
            const phraseSelection = selection?.getPhrase() ?? undefined;
            if (
                phraseSelection !== undefined &&
                phraseSelection !== null &&
                phraseSelection.index !== null
            ) {
                // Clamp: an index stashed before an external revise (undo, a palette edit)
                // can outrun the text it was measured against.
                const index = Math.min(
                    phraseSelection.index,
                    input.value.length,
                );
                input.setSelectionRange(index, index);
            }
            setKeyboardFocus(input, 'Restoring phrase text editor focus.');
        }
    });

    async function enter(event: MouseEvent | KeyboardEvent) {
        if (entered) {
            event.stopPropagation();
            return;
        }
        // A plain field can only edit plain text: typing into a formatted phrase would
        // flatten its markup into a TextLiteral. The palette edits markup properly, and
        // letting this gesture fall through selects the phrase and opens it there.
        if (!(phrase.text instanceof TextValue)) return;
        select(0); // sets selection.phrase.index = 0, making `entered` true
        event.stopPropagation();
        // Wait for the input to render, then focus it.
        await tick();
        if (input) setKeyboardFocus(input, 'Entering phrase text editor.');
    }

    /** Escape and Enter leave the field, keeping the phrase selected — without them the
     *  field is a keyboard dead end, since every other key is stopped below so the stage's
     *  own handlers (which move and delete output) never see the typing. */
    function handleInputKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' || event.key === 'Enter') {
            select(null);
            event.stopPropagation();
            event.preventDefault();
            if (view) setKeyboardFocus(view, 'Leaving phrase text editor.');
            return;
        }
        event.stopPropagation();
    }

    /** Double-clicking a phrase both edits its text AND opens the palette for it — matching how
     *  double-click opens the palette for shapes/groups/the stage. The phrase is already the
     *  selected output (chosen on the first pointer-down), so the palette shows its properties.
     *
     *  With the palette closed there is no selection to edit, so the gesture means what it means
     *  for every other output: let it reach OutputView, which selects what's under the pointer
     *  and opens the palette. Editing the text is then the second double-click. */
    function handleDoubleClick(event: MouseEvent) {
        if (!$paletteOpen) return;
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
            arrowMove(event.key) === undefined ||
            !(phrase.value.creator instanceof Evaluate)
        )
            return;

        // Place must be a Place to move it, so creator don't accidently delete a compelx expression.
        const mapping = phrase.value.creator.getInput(
            $project.shares.output.Phrase.inputs[3],
            $project.getNodeContext(phrase.value.creator),
        );
        if (!(
            mapping === undefined ||
            (mapping instanceof Evaluate &&
                mapping.is(
                    $project.shares.output.Place,
                    $project.getNodeContext(phrase.value.creator),
                ))
        ))
            return;

        // Clear the text-editing caret before revising: the move re-mounts this
        // view, and a caret index into text that no longer exists is stale.
        select(null);

        moveOutputWithKey(event, {
            db: DB,
            project: $project,
            creator: phrase.value.creator,
            output: phrase,
            locales: $locales,
            scene: $stageScene,
            grid: $grid ?? false,
            selection,
            announce: $announce,
        });
    }

    async function handleInput(event: { currentTarget: HTMLInputElement }) {
        if ($project === undefined || selection?.isEmpty()) return;
        if (event.currentTarget === null) return;
        const newText = event.currentTarget.value;
        const originalTextValue = phrase.getText();
        if (originalTextValue === undefined) return;
        // Carry the translation's language tag through, or editing on stage would quietly
        // strip the `/en` a creator wrote.
        const language =
            phrase.text instanceof TextValue ? phrase.text.language : undefined;

        // Reset the cache for proper layout.
        phrase.resetMetrics();

        if (event.currentTarget.selectionStart !== null)
            select(event.currentTarget.selectionStart);

        Projects.revise($project, [
            [
                phrase.value.creator,
                phrase.value.creator.replace(
                    originalTextValue.creator,
                    TextLiteral.make(newText, language),
                ),
            ],
        ]);
    }
</script>

{#if visible}
    <!-- Non-selectable phrases are exposed as images: screen readers read the
         description label rather than the raw glyphs, and a role is required
         for aria-label/aria-roledescription to be legal ARIA on a div. -->
    <div
        bind:this={view}
        role={selectable ? 'button' : 'img'}
        aria-hidden={empty ? 'true' : null}
        aria-disabled={!selectable}
        aria-label={description}
        aria-roledescription={!selectable
            ? $locales.getPrimaryPlainText((l) => getConceptName(l, 'phrase'))
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
        style:background={phrase.background?.toCSS(localContext.adapting) ??
            null}
        style:color={getColorCSS(
            phrase.getFirstRestPose(),
            phrase.pose,
            localContext.adapting,
        )}
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
                  phrase.aura.color?.toCSS(localContext.adapting) ??
                  getColorCSS(
                      phrase.getFirstRestPose(),
                      phrase.pose,
                      localContext.adapting,
                  ) ??
                  ''
              }`
            : null}
        style:white-space={phrase.wrap !== undefined ? 'normal' : 'nowrap'}
        style:text-align={phrase.alignment === undefined
            ? null
            : CSSAlignments[phrase.alignment]}
    >
        {#if phrase.bubble}
            <!-- aria-hidden because the words are already in the phrase's own
                 aria-label, via Phrase.getDescription — and a spoken bubble
                 leaves them out of that, since speech synthesis voices it.
                 The Announcer owns the app's only live region, so nothing here
                 announces on its own.

                 The font size is the stage's ordinary text size rather than the
                 speaker's: a character is often several metres tall, and dialog
                 set at that size is a wall rather than a line. Everything in the
                 bubble's own CSS is in em, so it scales from this. -->
            <div
                class="bubble {BubbleSideNames[
                    bubbleSide ?? phrase.bubble.getSide() ?? FallbackSide
                ]}"
                class:thought={phrase.bubble.isThought()}
                aria-hidden="true"
                transition:scale|local={{
                    duration: $animationDuration,
                    start: 0.5,
                }}
                style:color={phrase.bubble.color?.toCSS(
                    localContext.adapting,
                ) ?? null}
                style:--bubble-fill={phrase.bubble.background?.toCSS(
                    localContext.adapting,
                ) ?? null}
                style:font-size={getSizeCSS(phrase.bubble.size ?? context.size)}
                style:max-inline-size={phrase.bubble.wrap === undefined
                    ? null
                    : sizeToPx(phrase.bubble.wrap)}
            >
                <AnimatedText
                    text={phrase.bubble.getLocalizedTextOrDoc()}
                    changing={phrase.changing}
                    duration={phrase.duration}
                    style={phrase.style}
                    animationFactor={localContext.animationFactor}
                    language={effectLanguage}
                    region={effectRegion}
                    adapting={localContext.adapting}
                />
            </div>
        {/if}
        {#if soleSelected && editable && !entered && creator}
            <OutputHandles
                {creator}
                {view}
                selected={soleSelected}
                name={$locales.getPrimaryPlainText((l) =>
                    getConceptName(l, 'phrase'),
                )}
                rotation={phrase.pose.rotation ?? 0}
                size={phrase.size ?? localContext.size}
            />
        {/if}
        {#if entered}
            <!-- Stop propagation on key down so that only the input handles it when focused. -->
            <input
                type="text"
                value={editableText}
                bind:this={input}
                oninput={handleInput}
                onkeydown={handleInputKeyDown}
                onpointerdown={(event) => event.stopPropagation()}
                style:width="{Math.max(
                    10,
                    phrase.getMetrics(localContext, false).width,
                )}px"
                style:height="{metrics.height}px"
                style:line-height="{metrics.height}px"
            />
        {:else}<AnimatedText
                {text}
                changing={phrase.changing}
                duration={phrase.duration}
                style={phrase.style}
                animationFactor={localContext.animationFactor}
                language={effectLanguage}
                region={effectRegion}
                adapting={localContext.adapting}
            />{/if}
    </div>
{/if}

<style>
    /* A speech bubble is a decoration, not layout: like an aura, it is absent
       from getMetrics and getLayout, so a phrase occupies exactly the box its
       own text does and nothing on stage moves when someone starts talking.
       It lives inside the phrase's own element so it inherits the transform,
       opacity, color, and fontSize that OutputAnimation animates — a bubbled
       phrase carried by a Motion brings its bubble along for free. */
    .bubble {
        position: absolute;
        box-sizing: border-box;
        /* Everything is in em, so the bubble is the size of whoever is
           speaking: font-size *is* the output's size in metres (sizeToPx). */
        --tail: 0.3em;
        --edge: 0.06em;
        --fill: var(--bubble-fill, var(--wordplay-background));
        width: max-content;
        max-inline-size: 12em;
        padding: 0.3em 0.5em;
        border: var(--edge) solid currentcolor;
        border-radius: 0.5em;
        background: var(--fill);
        /* The phrase sets these for its own glyphs, and a bubble that inherited
           them would lay its words out vertically, on one metrics-exact line,
           unwrapped, and aligned to whatever the phrase chose. */
        writing-mode: horizontal-tb;
        line-height: 1.25;
        white-space: normal;
        text-align: start;
        /* break-word, not anywhere: `anywhere` also lets the box shrink below a
           word's width, which broke "Wordplay" across two lines in a narrow
           bubble. This breaks only a word that cannot fit a line by itself,
           which is still enough to keep a long URL inside the bubble. */
        overflow-wrap: break-word;
    }

    /* Positioning uses the standalone `translate` property, leaving `transform`
       free for the entry/exit scale — and transform-origin puts the growth at
       the tail, so a bubble appears out of the mouth of whoever said it. */
    .bubble.up {
        bottom: 100%;
        left: 50%;
        translate: -50% calc(-1 * var(--tail));
        transform-origin: 50% 100%;
    }
    .bubble.down {
        top: 100%;
        left: 50%;
        translate: -50% var(--tail);
        transform-origin: 50% 0%;
    }
    .bubble.left {
        right: 100%;
        top: 50%;
        translate: calc(-1 * var(--tail)) -50%;
        transform-origin: 100% 50%;
    }
    .bubble.right {
        left: 100%;
        top: 50%;
        translate: var(--tail) -50%;
        transform-origin: 0% 50%;
    }

    /* The tail, in the two-triangle idiom the tutorial's own bubbles use
       (lore/Speech.svelte): a fill-colored triangle over a slightly larger
       one in the border color, so the outline carries around the point. */
    .bubble::before,
    .bubble::after {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
    }
    .bubble.up::before,
    .bubble.up::after {
        left: 50%;
        translate: -50% 0;
        border-width: var(--tail) var(--tail) 0;
        border-left-color: transparent;
        border-right-color: transparent;
    }
    .bubble.up::before {
        top: 100%;
        border-top-color: currentcolor;
    }
    .bubble.up::after {
        top: calc(100% - var(--edge));
        border-top-color: var(--fill);
    }
    .bubble.down::before,
    .bubble.down::after {
        left: 50%;
        translate: -50% 0;
        border-width: 0 var(--tail) var(--tail);
        border-left-color: transparent;
        border-right-color: transparent;
    }
    .bubble.down::before {
        bottom: 100%;
        border-bottom-color: currentcolor;
    }
    .bubble.down::after {
        bottom: calc(100% - var(--edge));
        border-bottom-color: var(--fill);
    }
    .bubble.left::before,
    .bubble.left::after {
        top: 50%;
        translate: 0 -50%;
        border-width: var(--tail) 0 var(--tail) var(--tail);
        border-top-color: transparent;
        border-bottom-color: transparent;
    }
    .bubble.left::before {
        left: 100%;
        border-left-color: currentcolor;
    }
    .bubble.left::after {
        left: calc(100% - var(--edge));
        border-left-color: var(--fill);
    }
    .bubble.right::before,
    .bubble.right::after {
        top: 50%;
        translate: 0 -50%;
        border-width: var(--tail) var(--tail) var(--tail) 0;
        border-top-color: transparent;
        border-bottom-color: transparent;
    }
    .bubble.right::before {
        right: 100%;
        border-right-color: currentcolor;
    }
    .bubble.right::after {
        right: calc(100% - var(--edge));
        border-right-color: var(--fill);
    }

    /* A thought trails circles instead of a point, and rounds off, which is how
       a reader tells a thought from something said without being told. */
    .bubble.thought {
        border-radius: 1em;
        /* A wider gap than a point needs, so the trail has room to read as
           circles rather than as punctuation. Everything below is a fraction
           of it, so the trail always lands inside the gap. */
        --tail: 0.8em;
    }
    /* The border shorthand resets the triangle the side rules above built, so a
       thought's trail is two circles: the nearer one large, the further one
       small, shrinking toward the thinker the way a drawn one does. */
    .bubble.thought::before,
    .bubble.thought::after {
        border: var(--edge) solid currentcolor;
        border-radius: 50%;
        background: var(--fill);
        width: calc(var(--tail) * 0.5);
        height: calc(var(--tail) * 0.5);
    }
    .bubble.thought::after {
        width: calc(var(--tail) * 0.28);
        height: calc(var(--tail) * 0.28);
    }
    .bubble.thought.up::before {
        top: calc(100% + var(--tail) * 0.06);
    }
    .bubble.thought.up::after {
        top: calc(100% + var(--tail) * 0.66);
    }
    .bubble.thought.down::before {
        bottom: calc(100% + var(--tail) * 0.06);
    }
    .bubble.thought.down::after {
        bottom: calc(100% + var(--tail) * 0.66);
    }
    .bubble.thought.left::before {
        left: calc(100% + var(--tail) * 0.06);
    }
    .bubble.thought.left::after {
        left: calc(100% + var(--tail) * 0.66);
    }
    .bubble.thought.right::before {
        right: calc(100% + var(--tail) * 0.06);
    }
    .bubble.thought.right::after {
        right: calc(100% + var(--tail) * 0.66);
    }

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

    /* An empty phrase gets its placeholder size from `getMetrics` (see RenderContext's
       `placeholders`), not from a CSS minimum here: the same numbers drive the transform
       that places it, so a floor applied only at paint time would sit in a corner rather
       than where the layout put it. */
    :global(.editing) .phrase {
        pointer-events: all;
    }

    /* A read-only stage (gallery, how-to, preview) never drags or pans — the
       whole gesture block is gated on `editable` in OutputView — so a drag
       across its text has nothing to compete with and can select. The stage
       itself stays user-select: none, so only the words are selectable, which
       also keeps a drag from painting an out-of-reading-order highlight across
       phrases (each is its own absolutely-positioned, transformed box). */
    :global(.stage.readonly) .phrase {
        pointer-events: auto;
        user-select: text;
        -webkit-user-select: text;
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
