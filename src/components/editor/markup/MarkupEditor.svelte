<script lang="ts">
    import CaretView, {
        type CaretBounds,
    } from '@components/editor/caret/CaretView.svelte';
    import {
        handleKeyCommand,
        resetVisualColumnAfter,
        type CommandContext,
    } from '@components/editor/commands/Commands';
    import {
        caretFieldSelection,
        shouldEchoNatively,
    } from '@components/editor/input/mirrorSelection';
    import { editorAxes, type Axes } from '@components/editor/util/axes';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import { getRangeOutline } from '@components/editor/highlights/Highlights';
    import type { Outline } from '@components/editor/highlights/outline';
    import Node from '@nodes/Node';
    import isComposingKeyDown from '@components/editor/isComposingKeyDown';
    import MarkupCommands from '@components/editor/markup/MarkupCommands';
    import MarkupToolbar from '@components/editor/markup/MarkupToolbar.svelte';
    import {
        getAnnouncer,
        setEditor,
        setEditors,
        setProjectCommandContext,
        type EditorState,
    } from '@components/project/Contexts';
    import RootView from '@components/project/RootView.svelte';
    import { DB, locales } from '@db/Database';
    import Caret, {
        type CaretPosition as MarkupCaretPosition,
    } from '@edit/caret/Caret';
    import { getCaretPositionAt } from '@components/editor/pointer/PointerUtilities';
    import describeMarkupChange from '@edit/markup/describeChange';
    import markupHiddenTokens from '@edit/markup/markupHidden';
    import { paragraphAt, wordAt } from '@edit/markup/formatOperations';
    import {
        clampToMarkup,
        getMarkup,
        markupToSource,
        sourceToMarkup,
    } from '@edit/markup/markupSource';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import Project from '@db/projects/Project';
    import Source from '@nodes/Source';
    import Evaluator from '@runtime/Evaluator';
    import UnicodeString from '@unicode/UnicodeString';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { onDestroy, tick, untrack } from 'svelte';
    import { writable } from 'svelte/store';

    interface Props {
        /** The markup being edited. Bindable, and written back only on a real edit. */
        text: string;
        /** ARIA label and tooltip for the editing area. */
        description: LocaleTextAccessor;
        /** Shown when there is nothing written yet. */
        placeholder: LocaleTextAccessor;
        /** The id of the focusable field, so callers can address and label it. */
        id: string;
        /** Whether the delimiters are hidden (prose) or shown (source). */
        prose?: boolean;
        /** The hidden field, exposed for callers that focus it. */
        view?: HTMLTextAreaElement | undefined;
        /** Called when the mode command fires, so the caller owns the setting. */
        onToggleMode?: (() => void) | undefined;
    }

    let {
        text = $bindable(),
        description,
        placeholder,
        id,
        prose = true,
        view = $bindable(undefined),
        onToggleMode = undefined,
    }: Props = $props();

    const announce = getAnnouncer();

    /**
     * The markup is edited as a real `Source` — the markup string wrapped in
     * `¶…¶` — so the code editor's caret, renderer, and keyboard handling all
     * apply to prose unchanged. See markupSource.ts for why the wrapper is exact.
     */
    // svelte-ignore state_referenced_locally
    let source = $state<Source>(markupToSource(text));
    // svelte-ignore state_referenced_locally
    let caret = $state<Caret>(new Caret(source, 1, undefined, undefined));

    let editor = $state<HTMLElement | undefined>(undefined);
    let caretLocation = $state<CaretBounds | undefined>(undefined);
    let focused = $state(false);
    /** True briefly after a pointer placed the caret, so it doesn't blink at the
     *  moment of the click and doesn't scroll itself into view. */
    let placedByPointer = $state(false);
    let composing = $state(false);
    let composingJustEnded = $state(false);
    let skipNextInput = $state(false);

    /** Adopt a new value from the caller, but never clobber what is being typed. */
    $effect(() => {
        const incoming = text;
        untrack(() => {
            if (incoming === sourceToMarkup(source)) return;
            source = markupToSource(incoming);
            caret = clampToMarkup(new Caret(source, 1, undefined, undefined));
        });
    });

    let markup = $derived(getMarkup(source));

    /** The delimiters prose mode hides, revealing whichever run holds the caret. */
    let hiddenDelimiters = $derived(
        markup === undefined ? [] : markupHiddenTokens(markup, caret, prose),
    );

    /**
     * A scratch project, needed because `Caret.insert` and `CommandContext` both
     * require one. It is never analyzed for conflicts, never rendered as
     * annotations, and above all never saved — editing a locale string must not
     * write a project, which is why this is a separate component rather than a
     * configuration of Editor.svelte.
     */
    let project = $derived(
        Project.make(null, 'markup', source, [], $locales.getLocales()),
    );

    /**
     * `CommandContext` requires an evaluator, though no markup command consults
     * one — prose has nothing to evaluate. Built once and never started, rather
     * than derived: deriving it constructed a fresh evaluator on every keystroke,
     * and each one compiles the program. Non-reactive so it can never claim the
     * microphone or camera, and stopped on destroy per the convention in
     * evaluatorTeardownConvention.test.ts.
     */
    // svelte-ignore state_referenced_locally
    const evaluator = new Evaluator(project, DB, $locales.getLocales(), false);
    onDestroy(() => evaluator.stop());

    /**
     * The rendered token elements, cached: `computeCaretAndLineHeight` and
     * `gatherTextRows` both call this on every caret update, and an uncached
     * `querySelectorAll` per call is a walk of the whole editor each time. Keyed
     * on the source, since only an edit changes which tokens exist.
     */
    let tokenViews: { source: Source; views: HTMLElement[] } | undefined;
    function getTokenViews(): HTMLElement[] {
        if (editor === undefined) return [];
        if (tokenViews?.source !== source)
            tokenViews = {
                source,
                views: Array.from(
                    editor.getElementsByClassName('token-view'),
                ) as HTMLElement[],
            };
        return tokenViews.views;
    }

    /** How this editor's geometry maps onto the inline and block axes. */
    function getAxes(): Axes {
        return editorAxes(
            editor ?? null,
            'horizontal-tb',
            $locales.getDirection(),
        );
    }

    let commandContext = $derived<CommandContext>({
        caret,
        editor: true,
        project,
        locales: $locales,
        evaluator,
        database: DB,
        dragging: false,
        blocks: false,
        // The vertical movement commands bail on `!view || !getTokenViews` and
        // return false, which makes handleKeyCommand keep scanning — so without
        // these two, arrow up and down did nothing at all, not even the DOM-free
        // `moveLineVertical` fallback.
        view: editor,
        getTokenViews,
        writingLayout: 'horizontal-tb',
        zoom: undefined,
        toggleMarkupMode: onToggleMode,
        undoMarkup: undoRedo,
        canUndoMarkup: canUndo,
        canRedoMarkup: canRedo,
    });

    /**
     * Register with the two contexts `CommandButton` reads, so the toolbar drives
     * exactly the same commands the keyboard does — same tooltips, same shortcut
     * labels, same `active` predicates, same announcements. Most of `EditorState`
     * describes affordances a prose editor doesn't have (folding, blocks, zoom,
     * revealing a conflict), so those are inert.
     */
    const editors = writable(new Map<string, EditorState>());
    setEditors(editors);

    /** The singular editor context, which `CaretView` reads to know whether the
     *  editor has focus. Without it the caret renders permanently dimmed, which
     *  is how it looked: a faint mark rather than a caret. */
    const editorState = writable<EditorState>(undefined as never);
    setEditor(editorState);

    const commandContextState = $state({ context: undefined as never });
    setProjectCommandContext(commandContextState);

    $effect(() => {
        commandContextState.context = commandContext as never;
    });

    $effect(() => {
        const state: EditorState = {
            caret,
            displayedCaret: caret,
            sourceID: id,
            project,
            edit: async (revision) => {
                if (revision instanceof Caret) apply(revision);
                else if (
                    Array.isArray(revision) &&
                    revision[1] instanceof Caret
                )
                    apply(revision[1]);
            },
            focused,
            blocks: false,
            toggleMenu: () => {},
            grabFocus: (message: string) => focus(message),
            setCaretPosition: (position) => {
                apply(new Caret(source, position, undefined, undefined));
            },
            revealNode: () => {},
            refreshHighlights: () => {},
            foldAll: () => {},
            unfoldAll: () => {},
            canFoldAll: () => false,
            canUnfoldAll: () => false,
            zoom: 0,
            setZoom: () => {},
            writingLayout: 'horizontal-tb',
        };
        editors.set(new Map([[id, state]]));
        editorState.set(state);
    });

    /** Commit a revision, announce what changed, and publish the new markup. */
    function apply(revised: Caret, typing = false, edited?: Source) {
        const before = caret;
        const beforeText = sourceToMarkup(source);
        // A borrowed command returns its edit as `[Source, Caret]`, and the caret
        // is not always built on the new source — `Caret.delete`'s range branch
        // returns `this.withPosition(begin)`, which carries the OLD one. Reading
        // only the caret's source therefore threw the edit away: selecting text
        // and pressing Backspace moved the caret and changed nothing.
        const rebased =
            edited !== undefined &&
            edited !== revised.source &&
            !(revised.position instanceof Node)
                ? new Caret(edited, revised.position, undefined, undefined)
                : revised;
        const next = clampToMarkup(rebased);
        source = next.source;
        caret = next;
        // The ONLY place `text` is assigned. Opening the editor must not write
        // back: parsing normalizes emoji color selectors, so rewriting a
        // translator's string just because they looked at it would be a silent
        // edit of 1,321 of the strings the app ships (see canRepresent).
        text = sourceToMarkup(source);

        // Only a change to the text is undoable. `apply` also commits pure caret
        // moves, and an undo that gave back a cursor position rather than a word
        // would be heard as doing nothing.
        if (text !== beforeText)
            record({ text: beforeText, position: before.position }, typing);

        const message = describeMarkupChange(before, next, $locales);
        if (message !== undefined && announce && $announce)
            $announce('command', $locales.getLocales()[0].language, message);
    }

    /** The rendered element for a node, which the outline tracer measures. */
    function getNodeView(node: Node): HTMLElement | undefined {
        return (
            (document.getElementById(
                `node-${node.id}`,
            ) as HTMLElement | null) ?? undefined
        );
    }

    /**
     * The selection, drawn. Without this a selection exists in the model and is
     * invisible on screen — keyboard selection appeared to do nothing at all.
     * Only the range slice: the conflict, drag, attention, and reference layers
     * the code editor also draws have nothing to say about prose.
     */
    let selectionOutline = $state<Outline | undefined>(undefined);
    $effect(() => {
        // Depend on the rendered geometry, not just the caret: a selection has to
        // be re-traced when the text reflows under it.
        void source;
        void prose;
        void caret;
        const rtl = $locales.getDirection() === 'rtl';
        // AFTER the DOM commits, not during render. Tracing reads the rendered
        // nodes by id, and an edit gives every node a new id — so a derived,
        // which runs before Svelte commits, found none of them and yielded
        // nothing. That is why bolding a selection looked like it erased the
        // caret: `CaretView` hides itself for a range by design, and the outline
        // meant to replace it was traced against the previous DOM.
        tick().then(() => {
            const position = caret.position;
            selectionOutline = !Array.isArray(position)
                ? undefined
                : getRangeOutline(
                      caret.source,
                      position[0],
                      position[1],
                      getNodeView,
                      'horizontal-tb',
                      rtl,
                      false,
                  );
        });
    });

    /**
     * Undo history: the markup and the caret at each step.
     *
     * Local rather than `ProjectHistory`, which is keyed on a saved project (this
     * one is a scratch, so `Projects.getHistory` returns nothing for it), stores
     * whole serialized projects, is async, and does not remember carets. Until
     * now the plain textarea gave undo for free, so this is a regression the
     * moment the rich editor is on.
     */
    type Step = { text: string; position: MarkupCaretPosition };
    const HistoryLimit = 200;
    /** How long a run of typing keeps folding into one step, so undo doesn't
     *  give back one character at a time. */
    const CoalesceMs = 700;
    // svelte-ignore state_referenced_locally
    let history = $state<Step[]>([{ text, position: 1 }]);
    let historyIndex = $state(0);
    let lastRecorded = 0;

    /**
     * Record a step. `history[historyIndex]` is always the current state, so undo
     * restores `historyIndex - 1`.
     *
     * A run of typing folds into one step by *moving the tip* rather than by
     * skipping the record: skipping left the tip holding the first character of
     * the run, so undo correctly gave back the whole word but redo only returned
     * its first letter.
     */
    function record(before: Step, typing: boolean) {
        const now = Date.now();
        const current = {
            text: sourceToMarkup(source),
            position: caret.position,
        };
        const coalesce =
            typing &&
            now - lastRecorded < CoalesceMs &&
            historyIndex > 0 &&
            historyIndex === history.length - 1;
        lastRecorded = now;

        if (coalesce) {
            const extended = history.slice();
            extended[historyIndex] = current;
            history = extended;
            return;
        }

        // A new edit after undoing discards the redo tail, as every editor does.
        const kept = history.slice(0, historyIndex + 1);
        kept[kept.length - 1] = before;
        kept.push(current);
        history =
            kept.length > HistoryLimit
                ? kept.slice(kept.length - HistoryLimit)
                : kept;
        historyIndex = history.length - 1;
    }

    export function canUndo(): boolean {
        return historyIndex > 0;
    }

    export function canRedo(): boolean {
        return historyIndex < history.length - 1;
    }

    /** Step through the history, restoring both the markup and where the caret was. */
    export function undoRedo(direction: -1 | 1): boolean {
        const next = historyIndex + direction;
        if (next < 0 || next >= history.length) return false;
        historyIndex = next;
        const step = history[next];
        source = markupToSource(step.text);
        caret = clampToMarkup(
            new Caret(source, step.position, undefined, undefined),
        );
        text = step.text;
        lastRecorded = 0;
        return true;
    }

    /** Move the caret without recording history or announcing an edit: a
     *  selection change is not a change to the text. */
    function moveCaret(position: MarkupCaretPosition) {
        caret = clampToMarkup(caret.withPosition(position));
    }

    /** Where in the markup a pointer event lands, or undefined off the text. */
    function positionAt(event: PointerEvent): number | undefined {
        if (editor === undefined) return undefined;
        return getCaretPositionAt(
            caret,
            event,
            getTokenViews,
            editor,
            false,
            getAxes(),
        );
    }

    /** The anchor of a drag selection, and how far the pointer must move before
     *  a press becomes a drag rather than a click. */
    let dragStart = $state<number | undefined>(undefined);
    let dragOrigin: { x: number; y: number } | undefined = undefined;
    const DragThreshold = 10;

    /** Consecutive clicks in one place, for the word and paragraph selections. */
    let clickCount = 0;
    let clickTime = 0;
    let clickPosition: { x: number; y: number } | undefined = undefined;
    /** How long a second click still counts as part of the first. */
    const MultiClickMS = 500;

    function handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        event.preventDefault();
        // Focus first and unconditionally: a press anywhere in the editor must
        // put the keyboard here, even where no caret position resolves (the
        // space below the last line). Without this, clicking the editor and
        // typing did nothing at all.
        focus('Focusing the markup editor on pointer down.');
        const position = positionAt(event);
        if (position === undefined) return;

        // Double-click selects the word, triple-click the paragraph — what every
        // text field does. This used to select the whole TOKEN, which in prose is
        // usually the entire paragraph, and measured it in UTF-16 units where
        // positions count graphemes, so any emoji over-selected.
        //
        // The count is tracked here rather than read from `event.detail`, for the
        // reason `Editor.svelte` gives: `detail` is a MouseEvent notion, and a
        // `pointerdown` reports 0 for it, so the whole branch was unreachable.
        const consecutive =
            clickPosition !== undefined &&
            Math.abs(event.clientX - clickPosition.x) < DragThreshold &&
            Math.abs(event.clientY - clickPosition.y) < DragThreshold &&
            event.timeStamp - clickTime < MultiClickMS;
        clickCount = consecutive ? clickCount + 1 : 1;
        clickTime = event.timeStamp;
        clickPosition = { x: event.clientX, y: event.clientY };
        // Deliberately NOT `event.detail`, even where a platform populates it:
        // `pointerdown` reports 0 for it in Chromium, and where it is populated it
        // continues the platform's own click chain — so a click that placed the
        // caret a moment earlier made the next double-click count as a triple and
        // select the paragraph. Same conclusion `Editor.svelte` reached.
        if (clickCount >= 2) {
            const span =
                clickCount === 2
                    ? wordAt(source, position, $locales.getLocaleString())
                    : paragraphAt(source, position);
            if (span !== undefined && span[0] !== span[1]) {
                moveCaret(span);
                dragStart = undefined;
                focus('Selecting text in the markup editor.');
                return;
            }
        }

        moveCaret(position);
        dragStart = position;
        dragOrigin = { x: event.clientX, y: event.clientY };
        placedByPointer = true;
        setTimeout(() => (placedByPointer = false), 100);
        focus('Placing the caret in the markup editor.');
    }

    function handlePointerMove(event: PointerEvent) {
        if (
            event.buttons !== 1 ||
            dragStart === undefined ||
            dragOrigin === undefined
        )
            return;
        // Ignore the jitter of a click, so a click is never a one-character
        // selection.
        if (
            Math.abs(event.clientX - dragOrigin.x) < DragThreshold &&
            Math.abs(event.clientY - dragOrigin.y) < DragThreshold
        )
            return;
        const position = positionAt(event);
        if (position === undefined || position === dragStart) return;
        moveCaret([dragStart, position]);
    }

    function handlePointerUp() {
        dragStart = undefined;
        dragOrigin = undefined;
    }

    /** Mirror the source into the hidden field so the platform has real text to
     *  echo from (#1248). The `¶` wrapper is stripped: it is an artifact of the
     *  encoding, and a screen reader reading it aloud would be nonsense. */
    function syncMirror(current: Caret) {
        if (view === undefined || composing || skipNextInput) return;
        const { text: code, low, high } = caretFieldSelection(current);
        // The wrapper is one BMP character, so shifting by one code unit is exact.
        const value = code.slice(1, -1);
        if (view.value !== value) view.value = value;
        const start = Math.max(0, low - 1);
        const end = Math.max(0, high - 1);
        if (view.selectionStart !== start || view.selectionEnd !== end)
            view.setSelectionRange(start, end);
    }

    $effect(() => {
        const current = caret;
        void composing;
        void view;
        untrack(() => syncMirror(current));
    });

    function handleKeyDown(event: KeyboardEvent) {
        if (composing && !isComposingKeyDown(event)) handleCompositionEnd();
        if (composingJustEnded) {
            composingJustEnded = false;
            if (event.key === 'Process' || event.keyCode === 229) return;
        }
        if (composing || event.isComposing) return;
        if (isComposingKeyDown(event)) return;

        // Shared with the code editor: see shouldEchoNatively for why an
        // echo-bearing keystroke defaults through to the browser (#1248).
        skipNextInput = shouldEchoNatively(
            event,
            typeof caret.position === 'number',
        );

        const [command, result] = handleKeyCommand(
            event,
            commandContext,
            MarkupCommands,
        );

        // Only a `typing` command keeps the native echo: every other command
        // applies its own edit here, and letting the browser also edit the field
        // would double it. Same rule as Editor.svelte's.
        if (command?.typing !== true) skipNextInput = false;

        if (command !== undefined) {
            const adjusted = resetVisualColumnAfter(command, result as never);
            // A `typing` command is the catch-all that inserts the character
            // typed, so its edits fold into one undo step. Without this every
            // character was its own step and undo gave back one letter at a time.
            const typing = command.typing === true;
            if (adjusted instanceof Caret) apply(adjusted, typing);
            else if (Array.isArray(adjusted) && adjusted[1] instanceof Caret)
                apply(
                    adjusted[1],
                    typing,
                    adjusted[0] instanceof Source ? adjusted[0] : undefined,
                );
            // Let the browser make its own edit for a typing command, so the
            // screen reader echoes the character natively (#1248).
            if (!skipNextInput) event.preventDefault();
            // The conflict-annotation row and the project view both listen for
            // keystrokes above this editor; anything handled here is not theirs.
            event.stopPropagation();
            return;
        }

        // Tab always leaves. `role="application"` offers no other way out, so an
        // editor that consumes Tab is a keyboard trap — and unlike the code
        // editor, prose has no use for an inserted tab worth trading that for.
        if (event.key === 'Tab') return;

        // Nothing matched. Keep the browser from editing the field behind our
        // back unless this is an echo-bearing keystroke handled above. A chord is
        // left alone so the browser's own shortcuts (paste, in particular) still
        // reach it.
        const chord = event.ctrlKey || event.metaKey || event.altKey;
        if (!skipNextInput && !chord) event.preventDefault();
    }

    function handleInput(event: Event) {
        // The keydown command already applied this edit and deliberately let the
        // browser make its own edit to the field, so the screen reader echoes
        // natively (#1248). Applying it again here would type every character
        // twice. Re-sync so the field matches the model rather than the browser's
        // guess at it.
        if (skipNextInput) {
            skipNextInput = false;
            syncMirror(caret);
            return;
        }
        if (composing || view === undefined) return;

        const input = event as InputEvent;
        const data =
            input.inputType === 'insertLineBreak' ? '\n' : (input.data ?? '');

        // The browser's own undo on the mirrored field is an undo, not an edit:
        // routing it into `caret.delete` made Ctrl+Z delete a character.
        if (
            input.inputType === 'historyUndo' ||
            input.inputType === 'historyRedo'
        ) {
            undoRedo(input.inputType === 'historyUndo' ? -1 : 1);
            return;
        }

        if (input.inputType.startsWith('delete')) {
            // `false`, not `true`: the last argument is the blocks-mode soundness
            // gate, and prose has no blocks mode. With it on, a range spanning two
            // tokens — which in markup is any selection crossing a `*` — refused
            // to delete at all.
            const result = caret.delete(
                project,
                input.inputType.includes('Forward'),
                false,
            );
            if (Array.isArray(result))
                apply(
                    result[1],
                    false,
                    result[0] instanceof Source ? result[0] : undefined,
                );
            else syncMirror(caret);
            return;
        }

        if (data.length === 0) {
            syncMirror(caret);
            return;
        }

        const graphemes = new UnicodeString(data).getGraphemes();

        // More than one grapheme is a BULK edit — autocorrect replacing a word,
        // a platform autofill, an assistive tool writing a phrase — and the
        // browser has already applied it to the field. Adopt what the field
        // holds rather than replaying a guess at it. Taking the last grapheme
        // (the rule below) discarded everything before it: filling the field
        // with `who is $name?` left just `?`.
        if (graphemes.length > 1) {
            const value = view.value;
            const at = view.selectionStart ?? value.length;
            const revised = markupToSource(value);
            // The field counts UTF-16 code units and a caret counts graphemes,
            // and the `¶` wrapper adds one — the same conversion `syncMirror`
            // makes in the other direction (#1329).
            apply(
                clampToMarkup(
                    new Caret(
                        revised,
                        new UnicodeString(value).getGraphemePosition(at) + 1,
                        undefined,
                        undefined,
                    ),
                ),
            );
            return;
        }

        // One grapheme: a dead-key sequence arrives as the whole composed result,
        // not just the new character, so this takes the last of it.
        const char = graphemes[graphemes.length - 1] ?? data;
        const result = caret.insert(char, false, project, true);
        if (Array.isArray(result)) apply(result[1], true);
        else syncMirror(caret);
    }

    /**
     * ── Composition, and why it is duplicated ──────────────────────────────
     *
     * KEEP IN SYNC with `handleCompositionStart`/`handleCompositionEnd` and the
     * `composingJustEnded` guard in Editor.svelte. The *rules* that were worth
     * sharing are shared — `shouldEchoNatively` (#1248), `caretFieldSelection`
     * (#1329), and `isComposingKeyDown` (#1054) are all single implementations.
     * What is left here is the stateful glue, and it is deliberately not shared
     * because the two editors differ in ways a common factory would have to take
     * as parameters anyway: this one offsets every mirror position by the `¶`
     * wrapper, has no blocks mode, routes `historyUndo` to its own history, and
     * has no internal clipboard.
     *
     * What keeps the two honest is not a marker but coverage:
     * `ime-composition.spec.ts` runs Korean, Japanese, Latin, and stuck-
     * composition recovery against **both** editors. Before that, this copy had
     * none — a composition that silently drops syllables still renders and still
     * saves, and only a CJK creator would ever have seen it.
     */
    function handleCompositionStart() {
        composing = true;
        // Composition runs in an emptied field so `handleCompositionEnd`'s
        // "the value is the composed text" contract holds (#1054).
        if (view !== undefined) view.value = '';
    }

    function handleCompositionEnd() {
        composing = false;
        composingJustEnded = true;
        if (view === undefined) return;
        const composed = view.value;
        view.value = '';
        if (composed.length === 0) {
            syncMirror(caret);
            return;
        }
        const result = caret.insert(composed, false, project, true);
        if (Array.isArray(result)) apply(result[1]);
        else syncMirror(caret);
    }

    function handlePaste(event: ClipboardEvent) {
        event.preventDefault();
        const pasted = event.clipboardData?.getData('text/plain');
        if (pasted === undefined || pasted.length === 0) return;
        const result = caret.insert(pasted, false, project, true);
        if (Array.isArray(result)) apply(result[1]);
    }

    export function focus(message: string) {
        if (view !== undefined) setKeyboardFocus(view, message);
    }

    /** Insert text at the caret. The affordance callers used to get by writing
     *  into the field's `selectionStart`, which a mirror cannot offer: its
     *  offsets are the wrapped source's, in code units. */
    export function insert(insertion: string) {
        const result = caret.insert(insertion, false, project, true);
        if (Array.isArray(result)) apply(result[1]);
    }
</script>

<!-- The toolbar lives inside the editor rather than beside it so it travels in
     the same lazily-loaded chunk: FormattedEditor is reached from MarkupHTMLView,
     which every page renders, and a static import of the command list would put
     the language runtime back on every page's graph. -->
<MarkupToolbar sourceID={id} {prose} toggleMode={onToggleMode} />
<div
    {id}
    class="markup-editor"
    class:prose
    class:focused
    bind:this={editor}
    role="application"
    aria-label={$locales.getPrimaryPlainText(description)}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
>
    <!-- Before the rendered markup in tab order, so focus reaches the field. -->
    <textarea
        id={`${id}-field`}
        class="keyboard-input"
        aria-label={$locales.getPrimaryPlainText(description)}
        placeholder={$locales.getPrimaryPlainText(placeholder)}
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        bind:this={view}
        onkeydown={handleKeyDown}
        oninput={handleInput}
        oncompositionstart={handleCompositionStart}
        oncompositionend={handleCompositionEnd}
        onpaste={handlePaste}
        onfocusin={() => (focused = true)}
        onfocusout={() => (focused = false)}></textarea>
    <!-- Below the text, so a fill sits behind the glyphs; the container's
         `isolation: isolate` is what keeps its negative z-index from escaping. -->
    {#if selectionOutline}
        <Highlight
            outline={selectionOutline}
            underline={selectionOutline}
            types={['selected']}
            above={false}
        />
    {/if}
    {#if markup}
        <RootView
            node={markup}
            spaces={source.spaces}
            {caret}
            blocks={false}
            editable
            wrap
            layout="horizontal-tb"
            alsoHidden={hiddenDelimiters}
            {prose}
        />
    {/if}
    {#if selectionOutline}
        <Highlight
            outline={selectionOutline}
            underline={selectionOutline}
            types={['selected']}
            above={true}
        />
    {/if}
    <CaretView
        {caret}
        blocks={false}
        editable
        blink={focused && !placedByPointer}
        ignored={false}
        {getTokenViews}
        viewport={editor}
        writingLayout="horizontal-tb"
        zoom={0}
        {placedByPointer}
        menu={false}
        {prose}
        bind:location={caretLocation}
    />
</div>

<style>
    .markup-editor {
        position: relative;
        width: 100%;
        min-height: 2.25em;
        background: var(--wordplay-background);
        /* A selection highlight's below-layer is `z-index: -1` so a fill paints
           beneath the text without every token needing to be a positioned box.
           Without a stacking context here that negative index escapes the editor
           and paints behind the host's background, i.e. invisibly. */
        isolation: isolate;
        /* Every token is a box whose height is its line box, and the caret takes
           its height from that box. Inheriting the host's line-height meant the
           caret was as tall as a paragraph of prose. */
        line-height: var(--wordplay-code-line-height);
        font-size: var(--wordplay-font-size);
        cursor: text;
        /* The editor draws its own selection; the browser's would be a second,
           differently-shaped one over the same text. */
        user-select: none;
        -webkit-user-select: none;
    }

    /**
     * A markup token is a run of text between delimiters, so it is often a whole
     * paragraph — and a token is an `inline-block`, an atomic inline that cannot
     * be split across lines. So a paragraph following a bold run moved to the
     * next line whole rather than continuing after it. This applies in BOTH
     * modes: the markup is prose either way, and only the delimiters differ.
     *
     * It is safe because a caret inside a wrapped token is located by a collapsed
     * range rather than by arithmetic on a union box (see `locateCaretRect`).
     */
    .markup-editor :global(.token-view) {
        display: inline;
    }

    /* A hidden delimiter collapses by zeroing its box, which an inline element
       ignores — width and height do not apply to one. So a hidden token stays an
       inline-block: it is a single delimiter, and atomicity only matters for a
       token long enough to wrap. Without this, prose mode showed every `*`, `/`,
       and `\` it was supposed to hide. */
    .markup-editor :global(.token-view.hide) {
        display: inline-block;
    }

    /* The field is the accessible text surface and the caret the platform
       reports; it is invisible because the rendered markup is what's seen. */
    .keyboard-input {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        inline-size: 100%;
        block-size: 100%;
        opacity: 0;
        caret-color: transparent;
        border: none;
        resize: none;
        overflow: hidden;
        /* The field covers the whole editor, so without this it swallows every
           hit test: `document.elementFromPoint` — which all of the pointer
           caret-placement helpers call — would return this textarea instead of a
           token, and a click could never place the caret. */
        pointer-events: none;
        touch-action: none;
    }
</style>
